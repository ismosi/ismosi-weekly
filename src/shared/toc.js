import md from './markdown-it.js'
import { headingPlainText } from './headings.js'

/**
 * 提取博客正文目录：[{ level, text, id, line }]
 * - level：标题级别 1~6（# 的数量）
 * - id：标题锚点，与渲染时的 id 来自同一条 core 规则，目录跳转据此定位
 * - line：标题在源文中的行号（0 起），编辑态 textarea 据此定位光标
 * 代码块内的 # 不会被误判为标题；无标题时返回空数组。
 */
export function extractToc(text) {
  const tokens = md.parse(text ?? '', {})
  const items = []
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.type !== 'heading_open') continue
    items.push({
      level: Number(token.tag.slice(1)),
      text: headingPlainText(tokens[i + 1]),
      id: token.attrGet('id'),
      line: token.map?.[0] ?? 0,
    })
  }
  return items
}

/**
 * 把扁平标题数组组装成目录树：[{ ...item, children }]
 * 相邻更深层级的标题挂到最近的上级标题下，层级跳级（如 ## 后直接 ####）按深度就近挂靠；
 * 「父目录」即 children 非空的节点，折叠父目录时整个子树一起隐藏，
 * 各节点自身的折叠状态由 Toc 按 id 记忆，互不重置。
 */
export function buildTocTree(items) {
  const root = { children: [] }
  const stack = [root]
  for (const item of items) {
    while (stack.length > 1 && stack.at(-1).level >= item.level) stack.pop()
    const node = { ...item, children: [] }
    stack.at(-1).children.push(node)
    stack.push(node)
  }
  return root.children
}

/**
 * 按折叠状态展平目录树：collapsedIds 中 id 对应节点的整个子树不出现，
 * 其余节点连同各自已展开的后代按原顺序输出；
 * 返回 [{ ...node, depth }]，depth 为相对顶层标题的嵌套深度（0 起），供缩进与字号使用。
 */
export function flattenTocTree(nodes, collapsedIds, depth = 0, out = []) {
  for (const node of nodes) {
    out.push({ ...node, depth })
    if (node.children.length > 0 && !collapsedIds.has(node.id)) {
      flattenTocTree(node.children, collapsedIds, depth + 1, out)
    }
  }
  return out
}

/** 在容器内平滑滚动到锚点 id 对应的标题（阅读视图与预览视图共用） */
export function scrollToHeading(container, id) {
  container
    ?.querySelector(`#${CSS.escape(id)}`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** Markdown 源文第 line 行（0 起）行首的字符偏移量；越界时收敛到文末 */
export function lineToOffset(text, line) {
  const source = text ?? ''
  const lines = source.split('\n')
  let offset = 0
  for (let i = 0; i < line && i < lines.length; i++) offset += lines[i].length + 1
  return Math.min(offset, source.length)
}
