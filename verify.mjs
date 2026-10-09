/**
 * dsh-light-green-theme 自检 —— 用桩模拟 shell 的模块加载器，验证 lib/client.js 的 bundle 格式。
 *
 *   node verify.mjs
 *
 * 检查项：
 *   1. 文件是否调用了 window.__ModuleLoader__.load({ id, factory })
 *   2. id 是否等于 package.json 的 name
 *   3. factory 是否导出 apply（函数）与 inject
 *   4. 跑一遍 apply(ctx)，看它是否按预期调用 register / overrideTokens
 *   5. 每个令牌是否是合法的 { light, dark } 非空字符串对（官方 validateOverrides 的规则）
 *
 * 改完 PALETTE 或调整 apply() 后跑一下，能挡掉"装上了但静默不生效"这类问题。
 */

import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const clientPath = join(here, 'lib', 'client.js')
const pkgPath = join(here, 'package.json')

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
const src = fs.readFileSync(clientPath, 'utf8')

let failed = 0
const check = (ok, label, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? '  ' + detail : ''}`)
  if (!ok) failed++
}

console.log(`\n插件: ${pkg.name}`)
console.log(`文件: lib/client.js (${src.length} 字节)\n`)

// ---- 1/2. 加载器与 id ----
let captured = null
const injectedStyles = []
const fakeWindow = { __ModuleLoader__: { load: (def) => { captured = def } } }
const fakeDocument = {
  createElement: () => {
    const el = { dataset: {}, style: {}, remove() { el.removed = true } }
    return el
  },
  head: {
    appendChild(el) { injectedStyles.push(el) },
  },
}

console.log('一、bundle 外壳')
try {
  new Function('window', 'document', 'Object', 'Symbol', 'Number', 'String', src)(
    fakeWindow, fakeDocument, Object, Symbol, Number, String,
  )
  check(true, '文件可执行')
} catch (e) {
  check(false, '文件可执行', e.message)
}
check(captured !== null, '调用了 window.__ModuleLoader__.load()',
  captured === null ? '—— 外壳缺失，浏览器半侧不会注册' : '')
if (captured === null) {
  console.log('\n❌ 外壳不对，后续检查跳过。\n')
  process.exit(1)
}
check(captured.id === pkg.name, `id 与包名一致 (${captured.id})`,
  captured.id === pkg.name ? '' : `期望 ${pkg.name}`)
check(typeof captured.factory === 'function', 'factory 是函数')

// ---- 3. factory 导出 ----
console.log('\n二、factory 导出')
const mod = captured.factory((name) => {
  throw new Error('本插件不应 require 任何模块，却请求了: ' + name)
})
check(typeof mod.apply === 'function', '导出 apply 函数')
check(Array.isArray(mod.inject), '导出 inject 数组', JSON.stringify(mod.inject ?? null))

// ---- 4. 跑 apply ----
console.log('\n三、apply(ctx) 行为')

/** 造一个假 ctx；existingThemes 模拟"这个主题 id 已被别人注册" */
function makeCtx(existingThemes = []) {
  const calls = { register: [], overrideTokens: [], effects: [], errors: [] }
  return {
    calls,
    ctx: {
      effect(fn, label) {
        calls.effects.push(label)
        try { return fn() } catch (e) { calls.errors.push(`${label} -> ${e.message}`) }
      },
      theme: {
        // 真运行时里 getTheme() 返回快照，快照带 themes 列表
        getTheme: () => ({ themes: existingThemes }),
        register(def) { calls.register.push(def); return () => {} },
        overrideTokens(source, tokens) { calls.overrideTokens.push({ source, tokens }); return () => {} },
      },
    },
  }
}

// 场景 1：干净环境
const s1 = makeCtx([])
try {
  mod.apply(s1.ctx)
  check(true, 'apply() 未抛错')
} catch (e) {
  check(false, 'apply() 未抛错', e.message)
}
const calls = s1.calls
check(calls.errors.length === 0, 'effect 回调未抛错', calls.errors.join('; '))
check(calls.register.length + calls.overrideTokens.length > 0,
  '至少注册了主题或染色', `register=${calls.register.length} overrideTokens=${calls.overrideTokens.length}`)
for (const d of calls.register) {
  console.log(`      register: id=${d.id} colorScheme=${d.colorScheme} tokens=${Object.keys(d.tokens).length}`)
}
for (const o of calls.overrideTokens) {
  console.log(`      overrideTokens: source=${o.source} tokens=${Object.keys(o.tokens).length}`)
}

// 场景 2：主题 id 已被占用 —— 应该跳过 register，但染色照常
const s2 = makeCtx([{ id: 'light-green' }])
try {
  mod.apply(s2.ctx)
  check(true, 'id 被占用时 apply() 仍未抛错')
} catch (e) {
  check(false, 'id 被占用时 apply() 仍未抛错', e.message)
}
check(s2.calls.register.length === 0, 'id 被占用时跳过 register（不会抛重复 id 错）',
  `register=${s2.calls.register.length}`)
check(s2.calls.overrideTokens.length > 0, 'id 被占用时 overrideTokens 照常执行')

// 场景 3：getTheme 不可用 —— 可选调用应当降级为"没被占"，正常注册
const s3 = makeCtx([])
delete s3.ctx.theme.getTheme
try {
  mod.apply(s3.ctx)
  check(true, 'getTheme 缺失时 apply() 未抛错')
} catch (e) {
  check(false, 'getTheme 缺失时 apply() 未抛错', e.message)
}
check(s3.calls.register.length > 0, 'getTheme 缺失时仍会注册主题')

// ---- 5. 令牌形状 ----
console.log('\n四、令牌形状')
const allTokens = [
  ...calls.register.flatMap((d) => Object.entries(d.tokens)),
  ...calls.overrideTokens.flatMap((o) => Object.entries(o.tokens)),
]
const uniq = new Map(allTokens)
check(uniq.size > 0, '存在令牌')
let badShape = 0
let badPrefix = 0
for (const [name, v] of uniq) {
  const ok = v && typeof v === 'object'
    && typeof v.light === 'string' && v.light.length > 0
    && typeof v.dark === 'string' && v.dark.length > 0
  if (!ok) { badShape++; console.log(`      ✗ ${name} = ${JSON.stringify(v)}`) }
  if (!name.startsWith('--dsw-')) { badPrefix++; console.log(`      ✗ 非 --dsw- 前缀: ${name}`) }
}
check(badShape === 0, `${uniq.size} 个令牌都是 { light, dark } 对`)
check(badPrefix === 0, '令牌全部以 --dsw- 开头')

// ---- 6. 注入的 CSS ----
console.log('\n五、注入的样式')
const css = injectedStyles.map((el) => el.textContent ?? '').join('\n')
check(injectedStyles.length > 0, `注入了 ${injectedStyles.length} 个 <style>`)
if (injectedStyles.length > 0) {
  const hasSettingsBold = /wCInkW_navCell[\s\S]{0,80}font-weight/.test(css)
  const hasSessionBold = /hIlkoa_sessionRow\.hIlkoa_selected[\s\S]{0,120}font-weight/.test(css)
  check(/font-weight/.test(css), '含 font-weight 规则（令牌表达不了，只能注入）')
  check(hasSettingsBold, '设置左侧导航选中项加粗规则存在')
  check(hasSessionBold, '侧栏会话选中行加粗规则存在')
  const dswCount = (css.match(/--dsw-/g) ?? []).length
  if (dswCount) console.log(`      注意：注入的 CSS 里出现了 ${dswCount} 处 --dsw- 令牌引用`)
}


// ---- 7. 关键令牌是否在册 ----
console.log('\n六、关键令牌')
for (const name of [
  '--dsw-specific-sidebar-nav-item-active',
  '--dsw-specific-sidebar-nav-item-hover',
  '--dsw-alias-interactive-bg-hover',
  '--dsw-alias-bg-module-platform',
]) {
  check(uniq.has(name), name, uniq.has(name) ? `= ${uniq.get(name).light}` : '—— 缺失，该项不会跟随主题')
}

console.log(`\n${failed === 0 ? '✅ 全部通过' : `❌ ${failed} 项未通过`}\n`)
process.exit(failed === 0 ? 0 : 1)