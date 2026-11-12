/**
 * 博客文件格式（content/0001.md）：
 *
 * ---
 * id: 1
 * title: 标题
 * createdAt: 2026-08-17T10:00:00.000Z
 * updatedAt: 2026-08-18T12:30:00.000Z
 * ---
 * 正文（Markdown）
 *
 * updatedAt 为可选行：最近一次编辑落盘时间，未编辑过的博客（含旧文件）没有这一行。
 * 解析与序列化互相配套，只支持简单的「键: 值」行，不引入 YAML 依赖。
 */

const DELIMITER = '---'

export function parsePostFile(raw, source = '博客文件') {
  const lines = String(raw).split(/\r?\n/)
  if (lines[0]?.trim() !== DELIMITER) {
    throw new Error(`${source}：缺少 frontmatter，文件应以「---」开头`)
  }
  const data = {}
  let end = -1
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '') continue
    if (line.trim() === DELIMITER) {
      end = i
      break
    }
    const sep = line.indexOf(':')
    if (sep <= 0) throw new Error(`${source}：frontmatter 行格式错误「${line}」`)
    data[line.slice(0, sep).trim()] = line.slice(sep + 1).trim()
  }
  if (end === -1) throw new Error(`${source}：frontmatter 未闭合，缺少结尾的「---」`)
  return normalizePost(data, lines.slice(end + 1).join('\n'), source)
}

function normalizePost(data, body, source) {
  const id = Number(data.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`${source}：id 必须是正整数，实际为「${data.id}」`)
  }
  const title = String(data.title ?? '').trim()
  if (!title) throw new Error(`${source}：title 不能为空`)
  if (!isDate(data.createdAt)) throw new Error(`${source}：createdAt 不是合法的时间`)
  // updatedAt 可选：缺失（从未编辑过）或非法值时忽略为 null，不阻塞解析
  const updatedAt = isDate(data.updatedAt) ? data.updatedAt : null
  return {
    id,
    title,
    createdAt: data.createdAt,
    updatedAt,
    content: body.replace(/^\n+/, '').replace(/\s+$/, ''),
  }
}

function isDate(value) {
  return typeof value === 'string' && value !== '' && !Number.isNaN(new Date(value).getTime())
}

export function serializePost(post) {
  const keys = ['id', 'title', 'createdAt']
  if (post.updatedAt) keys.push('updatedAt') // 可选字段：未编辑过不写，保持与旧文件一致
  const header = keys
    .map(key => `${key}: ${post[key]}`)
    .join('\n')
  return `---\n${header}\n---\n\n${String(post.content ?? '').trim()}\n`
}
