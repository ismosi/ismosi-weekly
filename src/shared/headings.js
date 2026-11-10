/**
 * 标题相关纯函数：提取标题纯文本、生成锚点 id。
 * markdown-it.js 的 core 规则与 toc.js 共用，保证「目录条目」与「正文锚点」一一对应。
 */

/** 从标题的 inline token 提取纯文本，忽略加粗/斜体/链接/行内代码等格式标记 */
export function headingPlainText(inlineToken) {
  const parts = []
  for (const child of inlineToken?.children ?? []) {
    if (child.type === 'text' || child.type === 'code_inline') parts.push(child.content)
  }
  return parts.join('').trim()
}

/** 标题文字转锚点 id：保留中英文与数字，其余连续字符折叠为 -；重复时追加 -2、-3 */
export function makeHeadingId(text, used) {
  const base =
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'section'
  let id = base
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`
  used.add(id)
  return id
}
