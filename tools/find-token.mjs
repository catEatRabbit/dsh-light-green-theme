/**
 * 令牌／选择器反查工具。
 *
 * DSH 的客户端 UI 是构建产物，CSS-module 类名带哈希前缀（如 `hIlkoa_sessionRow`），
 * 升级后哈希会变。这个脚本用来重新定位：
 *
 *   1. 某个 --dsw-* 令牌的默认值定义在哪个包、值是多少
 *   2. 哪些 CSS 规则在消费这个令牌（→ 给出需要覆盖的选择器）
 *
 * ⚠️ 必须用 Electron 的 node 模式跑，因为要读 app.asar（普通 node 读不了 asar）：
 *
 *   PowerShell:
 *     $env:ELECTRON_RUN_AS_NODE=1
 *     & "E:\DeepSeek Harness\DeepSeek Harness.exe" "<本文件路径>" --dsw-specific-sidebar-nav-item-active
 *
 *   不带参数时，会列出名字里含 select/active/nav 的令牌，方便先找候选。
 *
 * 用法示例：
 *   ... "tools/find-token.mjs" --dsw-specific-sidebar-nav-item-active
 *   ... "tools/find-token.mjs" --list-active
 */

import fs from 'node:fs'

const ASAR_DSH = 'E:/DeepSeek Harness/resources/app.asar/dsh/node_modules/@deepseek-ai'

const args = process.argv.slice(2)
const listMode = args.includes('--list-active')
const token = args.find((a) => a.startsWith('--dsw-')) ?? null

if (!fs.existsSync(ASAR_DSH)) {
  console.error('找不到 app.asar 内的 @deepseek-ai 目录：' + ASAR_DSH)
  console.error('如果 DSH 装在别处，改本文件顶部的 ASAR_DSH。')
  process.exit(1)
}

// 收集所有客户端 bundle
const bundles = []
for (const pkg of fs.readdirSync(ASAR_DSH)) {
  const f = `${ASAR_DSH}/${pkg}/lib/client.js`
  if (fs.existsSync(f)) bundles.push({ pkg, text: fs.readFileSync(f, 'utf8') })
}
console.log(`已扫描 ${bundles.length} 个客户端 bundle\n`)

/** 反查：包含 token 的 CSS 规则（往前找 '{' 与选择器起点，往后找 '}'） */
function rulesUsing(text, needle) {
  const out = []
  let i = -1
  while ((i = text.indexOf(needle, i + 1)) !== -1) {
    const open = text.lastIndexOf('{', i)
    if (open === -1) { out.push(text.slice(Math.max(0, i - 120), i + 120)); continue }
    let start = open - 1
    while (start > 0 && !'};{'.includes(text[start - 1])) start--
    const close = text.indexOf('}', i)
    out.push(text.slice(start, close + 1))
  }
  return out
}

if (listMode || token === null) {
  console.log('=== 名字含 select / active / nav / hover 的令牌（选一个再传参精查）===')
  const seen = new Map()
  for (const { pkg, text } of bundles) {
    for (const m of text.matchAll(/(--dsw-[A-Za-z0-9_-]*(?:select|active|nav|hover)[A-Za-z0-9_-]*)\s*:\s*([^;{}"']{1,100})/g)) {
      if (!seen.has(m[1])) seen.set(m[1], { value: m[2].trim(), pkg })
    }
  }
  for (const [name, { value, pkg }] of [...seen].sort()) {
    console.log(`  ${name}\n      = ${value}      (${pkg})`)
  }
  console.log('\n再用同样的方式传具体令牌名精查，例如：')
  console.log('  ... "tools/find-token.mjs" --dsw-specific-sidebar-nav-item-active')
  process.exit(0)
}

console.log(`=== 令牌 ${token} ===`)

let foundDef = false
console.log('\n[定义处]')
for (const { pkg, text } of bundles) {
  for (const m of text.matchAll(new RegExp(`(${token.replace(/[-]/g, '\\-')})\\s*:\\s*([^;{}"']{1,120})`, 'g'))) {
    console.log(`  ${m[1]} = ${m[2].trim()}      (${pkg})`)
    foundDef = true
  }
}
if (!foundDef) console.log('  （没有直接定义，可能是被 var() 间接引用，或名字写错了）')

console.log('\n[消费它的 CSS 规则 → 这些就是你要覆盖/加样的选择器]')
let foundRule = false
for (const { pkg, text } of bundles) {
  if (!text.includes(token)) continue
  const rules = rulesUsing(text, token)
  console.log(`\n  --- ${pkg} (${rules.length} 条) ---`)
  for (const r of rules.slice(0, 10)) console.log('    ' + r.replace(/\s+/g, ' ').slice(0, 300))
  foundRule = true
}
if (!foundRule) console.log('  （没有任何规则消费它）')
