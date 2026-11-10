import md from './markdown-it.js'

/** 把 Markdown 文本渲染成受控的展示区块 */
export default function Markdown({ text }) {
  return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: md.render(text ?? '') }} />
}
