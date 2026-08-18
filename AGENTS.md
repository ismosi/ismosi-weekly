# AGENTS.md — 项目指南

## 项目概览

本地可编辑、GitHub Pages 展示的博客系统。技术栈：Vite + React + markdown-it。无线上后端：编辑期由本地 Node 服务直接读写 `content/` 目录的 Markdown 文件。

## 关键命令

| 命令 | 说明 |
| --- | --- |
| `npm run edit` | 启动本地编辑器（端口 5173，`/edit` 为编辑页，`/` 为展示页预览） |
| `npm run build` | 生成展示页到 `dist/`（编辑页不参与构建） |
| `npm test` | 运行单元测试（node:test） |

改动后必须运行 `npm test` 和 `npm run build` 验证。

## 架构

- **存储**：`content/0001.md`，frontmatter（id/title/createdAt/updatedAt）+ Markdown 正文。解析与序列化在 `src/shared/frontmatter.js`，无 YAML 依赖。
- **本地编辑服务** `scripts/edit-server.mjs`：单端口方案。`/api/*` 提供博客 CRUD（GET/POST/PUT/DELETE `/api/posts`），其余请求交给 Vite dev（middlewareMode + appType mpa，HMR 走同一 httpServer）。
- **构建** `scripts/build-content.mjs`：扫描 `content/`，生成 `src/generated/posts.json`（含全文，供展示页搜索；构建产物，已在 .gitignore 中）。
- **展示页**：`index.html` + `src/viewer/`，只读浏览 + 搜索。数据来自构建时生成的 JSON。
- **互动计数**：文章下方「加油/点赞/小眼睛」用 Abacus 免费计数服务（https://abacus.jasoncameron.dev），封装在 `src/shared/abacus.js`。命名空间 `ismosi-weekly`，键 `post-{id}-cheer|like|eye`（键名仅允许字母数字与 `-_ .`，不能用冒号），全局共享、只增不减；请求失败显示占位符 –，不阻塞阅读。
- **编辑页**：`edit.html` + `src/editor/`，仅本地。`vite.config.js` 的 build input 只有 index.html，所以编辑页永远不会进入部署产物。
- **共用层** `src/shared/`：frontmatter.js、posts.js（仅 Node，勿在前端导入）、date.js、Markdown.jsx、PostList.jsx、icons.jsx、SiteHeader.jsx（侧栏顶部 Logo + 标题）、PostFooter.jsx（链接组 + 欢迎交流计数）、ContentSearch.jsx（篇内搜索：高亮 + 上/下一个）、useSidebar.js（侧栏宽度拖拽与折叠，宽度存 localStorage）。Logo 资产在 `src/assets/logo.png`（源自根目录 `images/logo.png`，改动请同步复制）。

## 约定

- 编号自动递增：新博客编号 = 最大编号 + 1，从 1 开始，删除后不复用。
- 列表按 createdAt 倒序；同一创建时间按编号倒序（最新在前）。
- 布局：左侧博客列表（顶部 Logo + “Ismosi Weekly” 标题；编号 + 标题 + 创建日期），右侧内容白底（左上角编辑按钮 + 篇内搜索、右上角编辑日期）。侧栏默认宽 170px，可拖动右边框调整（localStorage 持久化）；可折叠（标题行 « 按钮 / 左缘把手展开），编辑页进入编辑自动折叠、保存或取消回到阅读自动展开。文章下方链接组（上一篇 = 更新的一篇、下一篇 = 更旧的一篇、GitHub 链接，无边框链接样式）与欢迎交流（💪 👍 👀 彩色表情 + 全局计数，标题居上方），由 `PostFooter` 提供，展示页与编辑页阅读视图共用。
- 部署（`.github/workflows/deploy.yml`）：push 到 main 时跑 `npm ci` / `npm run build` / `npm test`，通过后把 `dist/` 发布到 GitHub Pages；仓库设置里 Pages 来源需选「GitHub Actions」。package-lock.json 必须提交；`src/generated/posts.json` 由 build 前置脚本生成，不提交。
- Node >= 18。

## 测试

`node --test tests/`：frontmatter 解析/序列化（含报错分支）、posts 扫描排序与清单生成。
