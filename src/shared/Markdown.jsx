import MarkdownIt from 'markdown-it'

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

/** 把 Markdown 文本渲染成受控的展示区块 */
export default function Markdown({ text }) {
  return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: md.render(text ?? '') }} />
}
