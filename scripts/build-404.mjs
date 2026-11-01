#!/usr/bin/env node
/**
 * 构建后处理（npm run build 的最后一步）：
 * 把 dist/index.html 复制为 dist/404.html，作为 GitHub Pages 上 /edit/{id} 深链的回退页。
 * 注入的脚本在页面其余资源加载前把文档 base 指回站点根（本地 / 或 Pages 子路径 /repo/），
 * 深层路径下的相对资源（./assets/*、./images/*）才能正确加载；路由由展示页前端按 pathname 解析。
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const DIST_DIR = new URL('../dist/', import.meta.url)

const BASE_FIX = `<script>
// GitHub Pages 深链回退：/edit/{id} 会命中本 404 页，先把 base 指回站点根，再交给前端路由
(function () {
  var pathname = location.pathname
  var routeIndex = pathname.indexOf('/edit/')
  var base = routeIndex >= 0 ? pathname.slice(0, routeIndex + 1) : pathname.slice(0, pathname.lastIndexOf('/') + 1)
  document.write('<base href="' + base + '">')
})()
</script>`

let html
try {
  html = await readFile(new URL('index.html', DIST_DIR), 'utf8')
} catch {
  console.error('未找到 dist/index.html，请先运行 vite build')
  process.exit(1)
}
if (!html.includes('<head>')) {
  console.error('dist/index.html 缺少 <head>，无法注入 base 修正脚本')
  process.exit(1)
}

await writeFile(new URL('404.html', DIST_DIR), html.replace('<head>', `<head>\n  ${BASE_FIX}`))
console.log('已生成 dist/404.html（GitHub Pages /edit/{id} 深链回退页）')
