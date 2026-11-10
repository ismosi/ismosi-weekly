import MarkdownIt from 'markdown-it'
import { headingPlainText, makeHeadingId } from './headings.js'

const md = new MarkdownIt({ html: false, linkify: true })

// 正文图片以 /images/ 绝对路径存储；站点用相对 base 构建（GitHub Pages 子路径），
// 渲染时按 BASE_URL 重写，本地开发与线上部署都能正确显示
const defaultRenderImage =
  md.renderer.rules.image ??
  ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options))
md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const src = tokens[idx].attrGet('src')
  if (src?.startsWith('/images/')) {
    tokens[idx].attrSet('src', import.meta.env.BASE_URL + src.slice(1))
  }
  return defaultRenderImage(tokens, idx, options, env, self)
}

// 给每个标题注入锚点 id，供文章目录跳转定位；
// toc.js 的 extractToc 走同一条规则，目录条目与正文锚点天然一致。
// `used` 每次解析独立，重复标题自动追加 -2、-3，跨文章互不影响。
md.core.ruler.push('heading_anchor', state => {
  const used = new Set()
  for (let i = 0; i < state.tokens.length; i++) {
    const token = state.tokens[i]
    if (token.type !== 'heading_open') continue
    const text = headingPlainText(state.tokens[i + 1])
    token.attrSet('id', makeHeadingId(text, used))
  }
})

export default md
