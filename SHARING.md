# 分享与发布

两种场景：**把插件给别人用**，或者**发布到 GitHub / npm**。

---

## 一、分享给别人

DSH 的插件安装器接受三种"规格"，对应三种分享方式。

### 方式 A：文件夹（最省事）

1. 把整个插件文件夹打成 zip
2. 对方解压到**任意位置**（路径有中文也可以）
3. 对方：侧栏 **「插件」→「添加插件」** → 粘**解压后那个文件夹的绝对路径**
4. 安装 → **「立即启用」**

### 方式 B：`.tgz`（更规范）

```powershell
cd "<插件目录>"
npm pack
# 产出 dsh-light-green-theme-0.1.0.tgz
```

把 `.tgz` 给对方，同样在「添加插件」里粘 **tgz 的绝对路径**。

比 zip 好的地方：pnpm 原生理解 tarball，不会被系统当成"一个陌生文件夹"。

### 方式 C：Git 仓库（可更新，推荐）

推到 GitHub 后，对方在「添加插件」里直接粘：

```
github:catEatRabbit/dsh-light-green-theme
```

`github:` / `gitlab:` / `bitbucket:` / `gist:` 是安装器认识的标准简写
（它还会先 `git ls-remote` 探一下仓库可达性，再交给 pnpm）。

这是**唯一能"改完别人重装就升级"**的方式。

### 三种方式共同的注意事项

| 事项 | 说明 |
|---|---|
| **对方的 DSH 版本** | 加粗用的哈希类名与版本绑定。跨代 DSH 上会失效——不报错，只是不加粗 |
| **别移动文件夹** | 安装建的是 **Junction** 指向那个路径，移走了链接就断 |
| **配色是常驻的** | 默认 `pinPalette: true`，装上就会改掉对方当前的配色。只想让人试试，让他把 `pinPalette` 改成 `false` |

---

## 二、发布到 GitHub

### 准备

仓库根目录需要这几个文件（本仓库已包含）：

| 文件 | 作用 |
|---|---|
| `LICENSE` | 许可证。`package.json` 里写了 `"license": "MIT"`，就该配一个 MIT 文件 |
| `.gitignore` | 忽略 `node_modules/`、`*.tgz`、`.npm-cache/`、日志 |
| `.gitattributes` | `* text=auto eol=lf`，统一行尾，避免 Windows 上 CRLF 把 diff 弄成噪音 |
| `README.md` | 别人判断"要不要装"的唯一依据，写清安装方式和它能干什么 |

### 第 1 步：本地初始化并提交

```powershell
cd "<插件目录>"

git init -b main
git add -A
git status                  # 先看一眼，确认没有 node_modules / tgz 混进去
git commit -m "feat: DSH 浅绿主题 0.1.0"
```

### 第 2 步：网页建仓库

1. 打开 <https://github.com/new>
2. **Repository name** 填 `dsh-light-green-theme`（**必须 ASCII**，不能有中文）
3. **Description** 可以填中文
4. 选 **Public** —— 私有仓库别人装不了
5. ⚠️ **三个勾全部不要勾**：Add a README / Add .gitignore / Choose a license

   本地已经有了。勾了会产生两个不相关的历史，push 会冲突。

6. **Create repository**，然后复制它给出的仓库地址

### 第 3 步：关联远程并推送

```powershell
git remote add origin https://github.com/catEatRabbit/dsh-light-green-theme.git
git remote -v                      # 确认 owner / 仓库名没写错
git push -u origin main
```

首次推送会触发 **Git Credential Manager** 授权：选 *Sign in with your browser*，
在浏览器里点授权，回到终端看到 `branch 'main' set up to track 'origin/main'` 即成功。

> **常见的两个坑**
>
> 1. **`Repository not found`** 往往不是权限问题，而是 owner 或仓库名写错了。
>    GitHub 对"不存在"和"你没权限"都返回 404，不区分。复制粘贴仓库地址，别手打。
> 2. 只想重命名/改地址时用 `git remote set-url origin <新地址>`，不要 `remote add` 两次。

### 第 4 步：加 topic（**最重要，不做就没人找得到**）

**官方唯一的插件发现机制就是给仓库打 `dsh-plugin` topic。** 官方 README 关于插件分发
只有这一句——没有注册表、没有审核、没有 `dsh plugin search`（CLI 只有 `add` / `remove` / `why`）。

仓库页面 → 右侧 **About** 那一栏点 ⚙️ → **Topics** 里依次输入回车：

```
dsh-plugin
deepseek-harness
cordis
theme
```

`dsh-plugin` 是**必须**的，其余是辅助分类。

### 第 5 步（可选）：进精选列表

<https://github.com/awesome-dsh-plugin/awesome-dsh-plugin> 是事实上的社区目录，
按它的 README 格式提 PR 即可。那个列表（约 4600 条）是 `dshmarket` 这类市场的数据源——
进了列表，**用户装了市场就能搜到你的插件**。

> 注意它自己声明"上列表不代表安全审查，也不做质量评级"。所以 README 写清楚很重要。

### 日常更新

```powershell
node verify.mjs                  # 改完代码先自检
git add -A
git commit -m "fix: 调整强调色对比度"
git push
```

**插件不支持自动更新**：用户升级要**卸载再装**。所以版本号要老实涨，
建议配一个 `CHANGELOG.md`，并让增强能优雅降级（现在就是：哈希类名失效只是不加粗，不崩）。

---

## 三、发布到 npm

GitHub 是发现渠道，npm 是安装渠道。两个都做，效果最好。

### 需要补的字段

| 字段 | 说明 |
|---|---|
| `name` | 若 `dsh-light-green-theme` 已被占用就加 scope：`@你的npm用户名/dsh-light-green-theme`（查重：<https://www.npmjs.com/package/dsh-light-green-theme>） |
| `repository` / `homepage` / `bugs` | 指向 GitHub 仓库，npm 页面会显示，别人也好提 issue |
| `author` | 同上 |
| `files` | 白名单，只发布运行需要的文件 |
| `publishConfig.access` | scoped 包默认是私有的，要显式 `"access": "public"` |

⚠️ **改包名之后，本地已装的实例会失效**（浏览器半侧的模块身份取自包名）。
顺序是：**先在侧栏卸载 → 再改名 → 重新安装**。

### 发布前检查清单

| 检查项 | 缺失的后果 |
|---|---|
| `dsh.bundle.patch` 指向存在的 patch 文件 | 插件管理页**安装前就拒绝**："没有组合包 patch" |
| `exports["./client"]` | 声明了 `dsh.client` 却没这个导出 → 加载器**显式报错** |
| `cordis.patch.yml` 的 `name` == `package.json` 的 `name` | 浏览器半侧**挂不上**，静默 |
| `lib/client.js` 是 `window.__ModuleLoader__.load({…})` 外壳 | 写成普通 ESM → **静默不生效** |
| 每个令牌是 `{ light, dark }` 一对 | 单值会抛错 |
| `peerDependencies` 覆盖目标 DSH 版本 | **这是安装器真正强制的兼容门槛**，不满足直接拒绝安装 |
| `node verify.mjs` 全绿 | 上面几项它都会查 |

> 一个反直觉的点：**`engines.dsh` 只是声明**。官方文档明说安装器和加载器
> **不强制检查**它——真正卡安装的是 `peerDependencies`。

### 发布

```powershell
npm login
npm publish --access public        # scoped 包必须带；裸包可省略
```

发布后用本地验证一遍：

```powershell
dsh plugin --profile <某个非 desktop 的 profile> add <包名>
```

> `desktop` profile 会被拒绝：`profile "desktop" is managed exclusively by the
> Electron application` —— 桌面端只能走侧栏界面。

---

## 四、已知限制

诚实清单，按影响排序：

1. **加粗依赖哈希类名** —— 跨 DSH 版本会失效（不报错）。设置导航那条有
   `[aria-current]` 兜底，会话行没有语义钩子可用。插件自带 `tools/find-token.mjs`
   可以重新定位。
2. **配色是硬编码的** —— 别人想换色得改 `lib/client.js`。做成 UI 可配置要走 DSH 的
   `configForms` / settings 机制，是另一个工程量。
3. **没有图标** —— `package.json` 里加 `"icon": "./icon.svg"` 可以让插件卡片显示图片。
4. **`verify.mjs` 只是结构自检** —— 不是行为测试。要更严谨的话，
   建议补一个"真机加载后断言 `document.body.style` 里出现了预期令牌"的测试。
5. **不支持自动更新** —— 用户升级要卸载重装。
