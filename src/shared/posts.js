/**
 * 博客文件的扫描与管理（仅限 Node 环境，供脚本与测试使用）。
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parsePostFile, serializePost } from './frontmatter.js'

/** 编号转文件名：1 -> 0001.md */
export function padId(id) {
  return `${String(id).padStart(4, '0')}.md`
}

/** 新博客编号 = 当前最大编号 + 1；空目录从 1 开始 */
export function nextPostId(posts) {
  return posts.reduce((max, post) => Math.max(max, post.id), 0) + 1
}

/** 扫描目录里的全部博客，按创建时间倒序（最新在前），同一时间按编号倒序 */
export async function scanPosts(dir) {
  let names
  try {
    names = await readdir(dir)
  } catch (err) {
    if (err.code === 'ENOENT') return []
    throw err
  }
  const posts = []
  for (const name of names) {
    if (!name.endsWith('.md')) continue
    const raw = await readFile(path.join(dir, name), 'utf8')
    posts.push(parsePostFile(raw, name))
  }
  posts.sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1
    return b.id - a.id
  })
  return posts
}

/** 写入一篇博客文件（覆盖） */
export async function writePostFile(dir, post) {
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, padId(post.id)), serializePost(post), 'utf8')
}

/** 扫描博客并生成清单 JSON（展示页构建时使用） */
export async function writePostsJson(contentDir, outFile) {
  const posts = await scanPosts(contentDir)
  await mkdir(path.dirname(outFile), { recursive: true })
  await writeFile(outFile, `${JSON.stringify(posts, null, 2)}\n`, 'utf8')
  return posts
}
