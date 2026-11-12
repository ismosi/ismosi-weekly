# AGENTS.md — 项目指南

## 项目概览

本地可编辑、GitHub Pages 展示的博客系统。技术栈：Vite + React + markdown-it。无线上后端：编辑期由本地 Node 服务直接读写 `content/` 目录的 Markdown 文件。

## 关键命令

| 命令 | 说明 |
| --- | --- |
| `npm run edit` | 启动本地编辑器（端口 5173，`/edit` 为编辑页，`/` 为展示页预览） |
| `npm run build` | 生成展示页到 `dist/`，并把 index.html 复制为 `dist/404.html`（`/edit/{id}` 深链回退；编辑页不参与构建） |
| `npm test` | 运行单元测试（node:test） |

改动后必须运行 `npm test` 和 `npm run build` 验证。

## 架构

- **存储**：`content/0001.md`，frontmatter（id/title/createdAt）+ Markdown 正文。解析与序列化在 `src/shared/frontmatter.js`，无 YAML 依赖。可选 `updatedAt` 记录最近一次编辑落盘时间：仅编辑服务 PUT 更新时刷新，新建不写；缺失（从未编辑过，含全部旧文件）或非法值解析为 null、序列化时省略该行。
- **本地编辑服务** `scripts/edit-server.mjs`：单端口方案。`/api/*` 提供博客 CRUD（GET/POST/PUT/DELETE `/api/posts`）与图片上传（POST `/api/images`：校验 image/* 与文件魔数，≤10MB，存 `public/images/时间戳-随机.ext`）；本地 `/images/*` 由该服务直接读盘返回（Vite 静态中间件启动时缓存文件清单，运行中新上传的图片会 404），其余请求交给 Vite dev（middlewareMode + appType mpa，HMR 走同一 httpServer）。
- **博客路由 `/edit/{id}`**：每篇博客的唯一路径，解析/拼接在 `src/shared/route.js`（纯函数，`tests/route.test.mjs` 覆盖）。本地编辑服务对 `/edit`、`/edit/new`、`/edit/{id}` 都返回经 `vite.transformIndexHtml()` 转换后的 `edit.html`（必须转换以注入 React 热刷新前导脚本，否则 @vitejs/plugin-react 报 "can't detect preamble"、编辑页白屏；`npm run dev` 直跑 Vite 时由 vite.config.js 里的 edit-page-fallback 插件兕底）；编辑页与展示页在选中/新增/自动保存首次创建/删除时用 `history.pushState` 同步地址，popstate 支持前进后退。`/edit/{id}` 在本地是阅读视图（点「编辑」才进编辑态），线上 Pages 由 404.html 回退到展示页、仅只读；404.html 注入的脚本与 `edit.html` 里的 `<base href="/">` 把相对路径基准指回站点根，深层路径下 `./assets/*`、`./images/*` 才能正确加载。
- **构建** `scripts/build-content.mjs`：扫描 `content/`，生成 `src/generated/posts.json`（含全文，供展示页搜索；构建产物，已在 .gitignore 中）。
- **展示页**：`index.html` + `src/viewer/`，只读浏览 + 搜索，支持 `/edit/{id}` 深链只读访问。数据来自构建时生成的 JSON。
- **互动计数**：文章下方「加油/点赞/小眼睛」用 Abacus 免费计数服务（https://abacus.jasoncameron.dev），封装在 `src/shared/abacus.js`。命名空间 `ismosi-weekly`，键 `post-{id}-cheer|like|eye`（键名仅允许字母数字与 `-_ .`，不能用冒号），全局共享、只增不减；请求失败显示占位符 –，不阻塞阅读。
- **编辑页**：`edit.html` + `src/editor/`，仅本地。`vite.config.js` 的 build input 只有 index.html，所以编辑页永远不会进入部署产物。无独立保存/取消按钮，改为实时自动保存（`src/editor/useAutosave.js`）：输入停顿 600ms 防抖落盘，保存中不并发、结束自动排队补存；标题为空不落盘并在页脚状态栏提示；新博客（/edit/new）标题非空后首笔保存走创建、回填编号并把地址替换为 /edit/{id}，放弃的新博客留在列表需手动删除。页脚只有「退出」按钮：先 `flush()` 补存未落盘修改再回阅读视图（标题为空或保存失败时弹确认防丢字）；保存状态文案在 `src/editor/saveStatus.js`（待保存/保存中/已保存 HH:MM:SS/保存失败可点击重试/标题为空），样式 `.save-status`；popstate 前进后退时 fire-and-forget 补存，迟到的旧保存只刷新列表不污染新会话状态。
- **字体**：全站正文使用仓耳今楷（`TsangerJinKai02`）楷体网页字体，与 weekly.tw93.fun 一致。`public/fonts/jinkai.css` 定义 97 个 `unicode-range` 子集 woff2（托管在阿里 CDN `gw.alipayobjects.com`，按需下载），由 `index.html` / `edit.html` 异步 `<link>` 加载（`onload` 换 `rel=stylesheet`，`font-display: swap` 不阻塞首屏）。字体栈在 `src/styles.css` 的 `--font-body`，代码块仍用 `--font-mono`；CDN 失败时回退本机楷体（STKaiti/KaiTi）再回退系统字体。
- **文章目录（TOC）**：编辑页与展示页共用 `src/shared/Toc.jsx`。md 实例独立在 `src/shared/markdown-it.js`（Markdown.jsx 改为从此导入；含图片 `BASE_URL` 重写 + `heading_anchor` core 规则给标题注入锚点 id，`headings.js` 提供标题纯文本与 id 生成，重复标题追加 `-2`）；`toc.js` 的 `extractToc` 用同一实例 parse 提取 `[{level,text,id,line}]`（与渲染锚点同源，代码块内 `#` 忽略），并提供 `buildTocTree`/`flattenTocTree`（目录树组装与按折叠状态展平）、`scrollToHeading`（阅读/预览视图平滑滚动）与 `lineToOffset`（编辑态 textarea 光标定位到标题行）。面板 `position: fixed` 吸视口右侧、不参与 flex 布局，不挤占博客列表与正文宽度；宽度默认 172px（156px 正文宽 + 16px 折叠图标预留宽），可拖面板左缘调整（`useTocWidth.js`，localStorage `toc-width-v3`，156~416px）；被省略号截断的条目悬停时上方轻弹窗展示完整标题；被点击的条目持续保持悬停同款蓝色高亮；父目录（带下级标题）悬停时标题左侧浮现折叠箭头、移开消失，点击折叠/展开整个子树，各节点折叠状态按标题 id 记忆（编辑正文不丢失，孙级目录保持自身折叠状态），叶子标题无箭头；所有条目统一预留 16px 箭头宽度，同层级标题左对齐，标题不因箭头右移产生「兄弟变父目录」的层级误读；面板默认展开、可折叠不持久化、正文无标题时整体隐藏。
- **共用层** `src/shared/`：frontmatter.js、posts.js（仅 Node，勿在前端导入）、date.js、markdown-it.js、headings.js、toc.js、Toc.jsx、Markdown.jsx、PostList.jsx、icons.jsx、SiteHeader.jsx（侧栏顶部 Logo + 标题）、PostFooter.jsx（链接组 + 欢迎交流计数）、ContentSearch.jsx（篇内搜索：高亮 + 上/下一个）、useSidebar.js（侧栏宽度拖拽与折叠，宽度存 localStorage）、useTocWidth.js（目录面板宽度拖拽，宽度存 localStorage）。Logo 资产在 `src/assets/logo.png`（源自根目录 `images/logo.png`，改动请同步复制）。
- **正文图片**：编辑器支持直接粘贴图片 → 上传 `/api/images` → 光标处插入 `![](/images/xxx)`，支持 png/jpg/gif/webp，上限 10MB。图片文件在 `public/images/`，需提交 git（Pages 部署依赖）；删除博客不回收图片。

## 约定

- 编号自动递增：新博客编号 = 最大编号 + 1，从 1 开始，删除后不复用。
- 列表按 createdAt 倒序；同一创建时间按编号倒序（最新在前）。
- 布局：左侧博客列表（顶部 Logo + “Ismosi Weekly” 标题；编号 + 标题 + 创建日期），右侧内容白底（左上角编辑按钮 + 篇内搜索、右上角创建日期「创建于 xx」（正下方「编辑于 xx」仅编辑过、存在 updatedAt 时显示））。侧栏默认宽 325px，可拖动右边框调整（localStorage 持久化，key 为 sidebar-width-v2；改默认宽度时需升级 key，避免旧存档覆盖新默认值）；可折叠（标题行 « 按钮 / 左缘把手展开），编辑页进入编辑自动折叠、退出编辑回到阅读自动展开，编辑途中手动展开不会被输入再次折叠。文章下方链接组（上一篇 = 更新的一篇、下一篇 = 更旧的一篇、GitHub 链接，无边框链接样式）与欢迎交流（💪 👍 👀 彩色表情 + 全局计数，标题居上方），由 `PostFooter` 提供，展示页与编辑页阅读视图共用。
- 部署（`.github/workflows/deploy.yml`）：push 到 main 时跑 `npm ci` / `npm run build` / `npm test`，通过后把 `dist/` 发布到 GitHub Pages；仓库设置里 Pages 来源需选「GitHub Actions」。package-lock.json 必须提交；`src/generated/posts.json` 由 build 前置脚本生成，不提交。
- Node >= 18。

## 测试

`node --test tests/`：frontmatter 解析/序列化（含报错分支与编辑时间 updatedAt：缺失/非法为 null、序列化省略、往返一致）、posts 扫描排序与清单生成、`/edit/{id}` 路由解析与拼接、目录提取（层级/行号/id 去重/代码块忽略/lineToOffset）、目录树组装与按折叠状态展平（父目录子树隐藏/孙级状态保留/叶子不可折叠）、自动保存状态文案（tests/save-status.test.mjs）。
