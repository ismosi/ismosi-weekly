# [ismosi-weekly](https://pigsty-weekly.github.io)

> 技术周刊：记录在产品领域、AI 领域、技术领域、数字生活里的探索。
> 每周（或每两周）一期，编号连续，标题指向具体内容。

基于 Vite + React 的博客系统：本地写作，推送到 GitHub 后由 Actions 构建并发布到 GitHub Pages。

## 功能

**展示页**（发布到 GitHub Pages）
- 左侧博客列表、右侧内容，按创建时间倒序（最新在最上）
- 关键词搜索（标题 + 正文）

**编辑页**（仅本地运行，不会发布）
- 新增 / 编辑 / 删除 / 搜索博客
- Markdown 编辑模式与预览模式
- 编号自动递增：从 1 开始，删除后不复用

## 快速开始

```bash
npm install
npm run edit
```

打开 http://localhost:5173/edit 开始写作。博客保存在 `content/` 目录，写作完成后提交推送即可发布。

## 命令

| 命令 | 说明 |
| --- | --- |
| `npm run edit` | 启动本地编辑器（含展示页本地预览） |
| `npm run dev` | 仅预览展示页 |
| `npm run build` | 生成展示页到 `dist/`（编辑页不参与构建） |
| `npm test` | 运行单元测试 |

## 博客格式

每篇博客是一个 Markdown 文件，如 `content/0001.md`。文件头是元信息，由编辑器自动维护：

```markdown
---
id: 1
title: 第 1 篇：从这里开始记录
createdAt: 2026-08-17T10:00:00.000Z
updatedAt: 2026-08-17T10:00:00.000Z
---

正文（Markdown）……
```

## 目录结构

```
content/            博客（Markdown 文件）
scripts/            本地编辑服务与构建脚本
src/viewer/         展示页（构建并发布）
src/editor/         编辑页（仅本地）
src/shared/         共用代码
tests/              单元测试
```

## 发布

推送（push）到 main 分支后，GitHub Actions 自动构建并部署到 GitHub Pages。

---

# 最后

欢迎 star 与 issue 反馈。

> Build Year 2026 · 持续进行中
