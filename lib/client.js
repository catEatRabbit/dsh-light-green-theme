window.__ModuleLoader__.load({
	id: "dsh-light-green-theme",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		/**
		 * dsh-light-green-theme — 浏览器半侧。
		 *
		 * 主题 = 一套 --dsw-* CSS 令牌的覆盖。官方给了两个入口：
		 *
		 *   ctx.theme.register({ id, colorScheme, tokens })
		 *       注册成一个**可选主题**（出现在 设置 → 通用 → 外观）。
		 *       colorScheme 固定了这一主题算明色还是暗色系，
		 *       composeActive 只会取 tokens[name][colorScheme] 那一侧的值。
		 *
		 *   ctx.theme.overrideTokens(source, tokens)
		 *       给**当前**主题染色，不新增主题项。按当前激活主题的 colorScheme
		 *       自动取 light/dark 对应的一侧，所以一份 PALETTE 同时管明暗。
		 *
		 * 令牌的值必须是 { light, dark } **一对字符串**，只给一个会抛错：
		 *   theme override "…" is a bare string — pass { light: …, dark: … } …
		 *   a single value goes illegible when the user switches color scheme
		 *
		 * 令牌只能表达颜色／材质，表达不了 font-weight 之类。所以「选中项加粗」
		 * 走 extraCss() 自己注入样式。
		 *
		 * ⚠️ 本文件的外壳（window.__ModuleLoader__.load / factory / return module.exports）
		 * 不能删。DSH 的客户端 bundle 是**惰性 CJS factory** 格式，不是普通 ESM；
		 * 写成 export const / export default 的话加载器不认，插件会静默不生效。
		 * 改完跑 `node verify.mjs` 自检。
		 */

		// ═══════════════════ 开关 ═══════════════════

		const OPTIONS = {
			/** 注册浅色主题（外观里会多出一个可选的浅绿方块）。 */
			registerLight: true,

			/** 注册深色主题。只要浅色那个，所以关掉。 */
			registerDark: false,

			/**
			 * 常驻染色。
			 *
			 * 为什么需要它：源码里 setTheme() 只对内置偏好落盘 ——
			 *   if (isThemePreference(id)) this.host.set(THEME_PREFERENCE_FIELD, id)
			 * 而 THEME_PREFERENCES 只有 ["light","dark","system"]，设置 schema 也只收这三个。
			 * 所以**注册的主题能选，但选择不会跨重启保留**，重启后回落到内置偏好。
			 *
			 * 打开它则由 overrideTokens 常驻施加，跟内置明暗偏好一起持久化。
			 */
			pinPalette: true,

			/** 深色模式也用浅色那套值（严格「只要浅色」）。 */
			forceLightEverywhere: false,

			/** 选中的菜单／会话行加粗。font-weight 令牌表达不了，靠注入 CSS。 */
			boldSelected: true,
		}

		// ═══════════════════ 配色 ═══════════════════

		/**
		 * 浅绿配色。浅色一侧由一张界面截图逐点采样得到，深色一侧按浅色色相派生。
		 *
		 *   截图里的「应用底色」    #f6f8f5  →  --dsw-alias-bg-base
		 *   截图里的「侧栏底色」    #e3ece4  →  --dsw-specific-sidebar-fill
		 *   截图里的「白卡片」      #ffffff  →  --dsw-alias-bg-layer-1
		 *   截图里的「浅绿包裹层」  #e9f4ea  →  --dsw-alias-bg-layer-2
		 *   截图里的「选中药丸」    #c3dcc6  →  --dsw-alias-bg-module-platform
		 *   截图里的「品牌绿」      #3c8c4e  →  --dsw-alias-brand-primary
		 */
		const PALETTE = {
			'--dsw-alias-bg-base': { light: '#f6f8f5', dark: '#131811' },
			'--dsw-alias-bg-layer-1': { light: '#ffffff', dark: '#191f1a' },
			'--dsw-alias-bg-layer-2': { light: '#e9f4ea', dark: '#1b321d' },
			'--dsw-alias-bg-overlay': { light: '#ffffff', dark: '#1d251e' },
			'--dsw-specific-sidebar-fill': { light: '#e3ece4', dark: '#0c120d' },

			'--dsw-alias-border-l1': { light: '#dce7dd', dark: '#2b402d' },
			'--dsw-alias-border-l2': { light: '#cde0ce', dark: '#375839' },

			'--dsw-alias-brand-primary': { light: '#3c8c4e', dark: '#3c8c4e' },

			'--dsw-alias-label-primary': { light: '#283a2f', dark: '#dee8e2' },
			// 采样原值是 #7a897f，在底色上对比度只有 3.44（低于 WCAG AA 的 4.5），
			// 这里压暗到 5.14，色相不变。想还原就换回 #7a897f。
			'--dsw-alias-label-secondary': { light: '#606c64', dark: '#9baba1' },

			'--dsw-alias-interactive-bg-hover': { light: '#d8e8dc', dark: '#233928' },
			'--dsw-alias-bg-module-platform': { light: '#c3dcc6', dark: '#325336' },

			// —— 设置对话框左侧导航 ——
			// 默认值：active = --dsw-static-neutral-bluish-100 = #ebeef2（中性蓝灰），
			// 不覆盖的话设置里选中的那一项不会跟着主题变色。
			'--dsw-specific-sidebar-nav-item-active': { light: '#c3dcc6', dark: '#325336' },
			'--dsw-specific-sidebar-nav-item-hover': { light: '#d8e8dc', dark: '#233928' },
			'--dsw-specific-sidebar-nav-item-active-accent': { light: '#c3dcc6', dark: '#325336' },
		}

		/** forceLightEverywhere 时把两侧压成同一套浅色值。 */
		const effectivePalette = () => {
			if (!OPTIONS.forceLightEverywhere) return PALETTE
			const flat = {}
			for (const name of Object.keys(PALETTE)) {
				flat[name] = { light: PALETTE[name].light, dark: PALETTE[name].light }
			}
			return flat
		}

		// ═══════════════════ 注入的额外样式 ═══════════════════

		/**
		 * 令牌表达不了的东西放这里。
		 *
		 * ⚠️ 下面用的是 DSH 构建产物的 **CSS-module 哈希类名**，只在当前版本有效。
		 * DSH 升级后如果加粗失效（不会报错，只是没效果），把类名按新版本改掉即可。
		 * 定位方法见 tools/find-token.mjs，或用 `aria-current` 这类语义钩子兜底。
		 */
		const extraCss = () => {
			if (!OPTIONS.boldSelected) return ''

			return `/* dsh-light-green-theme: bold selected */
/* 设置对话框左侧导航：选中项加粗。
   .wCInkW_navCell 来自 @deepseek-ai/dsh-client-ui-settings-general；
   [aria-current] 是它同时给出的语义钩子，两者都写以防哈希变化。 */
.wCInkW_navCell.wCInkW_active,
.wCInkW_navCell[aria-current] {
  font-weight: 600;
}

/* 侧栏工作区里的会话列表：选中行加粗。
   .hIlkoa_sessionRow / .hIlkoa_selected / .hIlkoa_title
   来自 @deepseek-ai/dsh-client-ui-workspace。 */
.hIlkoa_sessionRow.hIlkoa_selected,
.hIlkoa_sessionRow.hIlkoa_selected .hIlkoa_title {
  font-weight: 600;
}
`
		}

		// ═══════════════════════════════════════════

		const SOURCE = 'dsh-light-green-theme'

		const apply = (ctx) => {
			const palette = effectivePalette()

			/**
			 * register 对重复 id 会抛错，抛在 effect 里会让整个插件激活失败。
			 * 所以先查一下这个 id 有没有被别人占着——getTheme() 的快照带着
			 * themes 列表（buildSnapshot 里 themes: Object.freeze([...this.themes])）。
			 * 用可选调用：拿不到快照就当作没被占，正常注册。
			 */
			const taken = (id) => {
				const snapshot = ctx.theme.getTheme?.()
				return Array.isArray(snapshot?.themes) && snapshot.themes.some((t) => t.id === id)
			}

			// 1. 注册可选主题。
			if (OPTIONS.registerLight && !taken('light-green')) {
				ctx.effect(
					() => ctx.theme.register({ id: 'light-green', colorScheme: 'light', tokens: palette }),
					'dsh-light-green-theme: register light-green (light)',
				)
			}
			if (OPTIONS.registerDark && !taken('light-green-dark')) {
				ctx.effect(
					() => ctx.theme.register({ id: 'light-green-dark', colorScheme: 'dark', tokens: palette }),
					'dsh-light-green-theme: register light-green-dark (dark)',
				)
			}

			// 2. 常驻染色，让配色跟着内置明暗偏好一起持久化。
			if (OPTIONS.pinPalette) {
				ctx.effect(
					() => ctx.theme.overrideTokens(SOURCE, palette),
					'dsh-light-green-theme: pin palette',
				)
			}

			// 3. 注入令牌表达不了的样式（选中项加粗）。
			const css = extraCss()
			if (css === '') return

			ctx.effect(() => {
				const tag = document.createElement('style')
				tag.dataset.plugin = SOURCE
				tag.textContent = css
				document.head.appendChild(tag)
				return () => tag.remove()
			}, 'dsh-light-green-theme: injected css')
		}

		exports.name = 'dsh-light-green-theme'
		exports.inject = ['theme']
		exports.apply = apply
		return module.exports
	}
})
