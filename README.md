# DSH 浅绿主题

DSH 客户端的浅绿配色主题。覆盖 `--dsw-*` 令牌，并把选中的菜单项和会话行加粗。

![配色预览](palette-preview.png)

## 安装

侧栏「插件」→「添加插件」，粘下面任意一个：

- `github:catEatRabbit/dsh-light-green-theme`
- 本地插件文件夹的绝对路径，例如 `E:\deepseek的一个工作区\dsh-my-theme`

装完点「立即启用」，不用重启。

然后到 设置 → 通用 → 外观，明暗选「浅色」。用「跟随系统」的话，系统是深色就会走深色那套值。

## 配色

| 用途 | 浅色 | 深色 | 令牌 |
|---|---|---|---|
| 底色 | `#f6f8f5` | `#131811` | `--dsw-alias-bg-base` |
| 侧栏 | `#e3ece4` | `#0c120d` | `--dsw-specific-sidebar-fill` |
| 卡片 | `#ffffff` | `#191f1a` | `--dsw-alias-bg-layer-1` |
| 嵌套面 | `#e9f4ea` | `#1b321d` | `--dsw-alias-bg-layer-2` |
| 描边 | `#dce7dd` / `#cde0ce` | `#2b402d` / `#375839` | `--dsw-alias-border-l1` / `-l2` |
| 品牌绿 | `#3c8c4e` | `#3c8c4e` | `--dsw-alias-brand-primary` |
| 正文 | `#283a2f` | `#dee8e2` | `--dsw-alias-label-primary` |
| 次级文字 | `#606c64` | `#9baba1` | `--dsw-alias-label-secondary` |
| 选中 | `#c3dcc6` | `#325336` | `--dsw-alias-bg-module-platform` |
| 悬停 | `#d8e8dc` | `#233928` | `--dsw-alias-interactive-bg-hover` |
| 设置导航选中 | `#c3dcc6` | `#325336` | `--dsw-specific-sidebar-nav-item-active` |

浅色一侧是从一张界面截图逐点采样的，深色按同一色相（H≈126°）派生。

改配色编辑 `lib/client.js` 里的 `PALETTE`，每项要写 `{ light, dark }` 两个值。改完跑 `node verify.mjs`。

## 卸载

侧栏「插件」→「已安装」→ 卸载。

---

分享与发布见 [SHARING.md](SHARING.md)。
