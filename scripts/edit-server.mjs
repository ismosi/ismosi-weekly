#!/usr/bin/env node
/**
 * 本地博客编辑器服务（npm run edit）
 * - /api/*  ：读写 content/ 目录里的博客文件
 * - 其他请求：交给 Vite 开发服务器（本地预览编辑页与展示页）
 */
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { createServer as createViteServer } from 'vite'
import { nextPostId, padId, scanPosts, writePostsJson } from '../src/shared/posts.js'
import { serializePost } from '../src/shared/frontmatter.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT_DIR = path.join(ROOT, 'content')
const GENERATED_JSON = path.join(ROOT, 'src/generated/posts.json')
const PORT = Number(process.env.PORT || 5173)
const MAX_BODY_BYTES = 2 * 1024 * 1024

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload))
}

async function readJson(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new HttpError(413, '内容过大（上限 2MB）')
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  } catch {
    throw new HttpError(400, '请求体不是合法的 JSON')
  }
}

function cleanTitle(raw) {
  const title = String(raw ?? '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
  if (!title) throw new HttpError(400, '标题不能为空')
  return title
}

function cleanContent(raw) {
  return String(raw ?? '').replace(/\r\n/g, '\n')
}

async function writePostFile(post) {
  await mkdir(CONTENT_DIR, { recursive: true })
  await writeFile(path.join(CONTENT_DIR, padId(post.id)), serializePost(post), 'utf8')
}

async function findPost(id) {
  const posts = await scanPosts(CONTENT_DIR)
  const post = posts.find(item => item.id === id)
  if (!post) throw new HttpError(404, `博客 #${id} 不存在`)
  return post
}

async function handleApi(req, res) {
  const { pathname } = new URL(req.url, 'http://localhost')
  const segments = pathname.split('/').filter(Boolean) // ['api', 'posts', id?]
  if (segments[0] !== 'api' || segments[1] !== 'posts' || segments.length > 3) {
    throw new HttpError(404, '接口不存在')
  }
  const id = segments.length === 3 ? Number(segments[2]) : null

  if (req.method === 'GET' && id === null) {
    return json(res, 200, { posts: await scanPosts(CONTENT_DIR) })
  }

  if (req.method === 'POST' && id === null) {
    const body = await readJson(req)
    const posts = await scanPosts(CONTENT_DIR)
    const now = new Date().toISOString()
    const post = {
      id: nextPostId(posts),
      title: cleanTitle(body.title),
      createdAt: now,
      updatedAt: now,
      content: cleanContent(body.content),
    }
    await writePostFile(post)
    return json(res, 201, { post })
  }

  if (req.method === 'PUT' && id !== null) {
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, '博客编号无效')
    const body = await readJson(req)
    const existing = await findPost(id)
    const post = {
      ...existing,
      title: cleanTitle(body.title),
      content: cleanContent(body.content),
      updatedAt: new Date().toISOString(),
    }
    await writePostFile(post)
    return json(res, 200, { post })
  }

  if (req.method === 'DELETE' && id !== null) {
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, '博客编号无效')
    await findPost(id)
    await unlink(path.join(CONTENT_DIR, padId(id)))
    return json(res, 200, { ok: true })
  }

  throw new HttpError(405, '不支持的请求方法')
}

const httpServer = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    handleApi(req, res).catch(err => {
      const status = err instanceof HttpError ? err.status : 500
      if (status === 500) console.error(err)
      json(res, status, { error: err.message || '服务器内部错误' })
    })
    return
  }
  vite.middlewares(req, res)
})

const vite = await createViteServer({
  root: ROOT,
  server: { middlewareMode: true, hmr: { server: httpServer } },
})

// 启动时生成一次博客清单，方便在本地直接预览展示页
await writePostsJson(CONTENT_DIR, GENERATED_JSON)

httpServer.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`端口 ${PORT} 已被占用。请先关闭占用进程，或用 PORT=其他端口 npm run edit 换端口。`)
    process.exit(1)
  }
  throw err
})

httpServer.listen(PORT, () => {
  console.log('本地博客编辑器已启动')
  console.log(`  编辑界面：http://localhost:${PORT}/edit`)
  console.log(`  展示预览：http://localhost:${PORT}/`)
  console.log(`  博客目录：${CONTENT_DIR}`)
  console.log('  按 Ctrl+C 退出')
})

function shutdown() {
  vite.close()
  httpServer.close(() => process.exit(0))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
