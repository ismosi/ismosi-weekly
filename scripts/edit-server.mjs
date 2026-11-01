#!/usr/bin/env node
/**
 * 本地博客编辑器服务（npm run edit）
 * - /api/posts  ：读写 content/ 目录里的博客文件
 * - /api/images ：上传图片到 public/images/（供正文粘贴图片用）
 * - 其他请求    ：交给 Vite 开发服务器（本地预览编辑页与展示页）
 */
import http from 'node:http'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises'
import { createServer as createViteServer } from 'vite'
import { nextPostId, padId, scanPosts, writePostsJson } from '../src/shared/posts.js'
import { serializePost } from '../src/shared/frontmatter.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT_DIR = path.join(ROOT, 'content')
const GENERATED_JSON = path.join(ROOT, 'src/generated/posts.json')
const PORT = Number(process.env.PORT || 5173)
const MAX_BODY_BYTES = 2 * 1024 * 1024
const IMAGES_DIR = path.join(ROOT, 'public', 'images')
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

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

// 通过文件头（魔数）识别真实图片格式，避免仅凭 Content-Type 误存非图片内容
const IMAGE_TYPES = [
  {
    ext: 'png',
    test: buffer =>
      buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  { ext: 'jpg', test: buffer => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  { ext: 'gif', test: buffer => buffer.subarray(0, 3).toString('latin1') === 'GIF' },
  {
    ext: 'webp',
    test: buffer =>
      buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
      buffer.subarray(8, 12).toString('latin1') === 'WEBP',
  },
]

/** POST /api/images：请求体为图片二进制，存入 public/images/ 并返回可引用的 URL */
async function handleImageUpload(req, res) {
  if (req.method !== 'POST') throw new HttpError(405, '不支持的请求方法')
  if (!String(req.headers['content-type'] ?? '').startsWith('image/')) {
    throw new HttpError(415, '请上传图片（Content-Type: image/*）')
  }

  const chunks = []
  let size = 0
  let oversized = false
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_IMAGE_BYTES) {
      oversized = true // 继续读完请求体，客户端才能正常收到错误响应
      continue
    }
    chunks.push(chunk)
  }
  if (oversized) throw new HttpError(413, '图片过大（上限 10MB）')

  const buffer = Buffer.concat(chunks)
  const type = IMAGE_TYPES.find(item => item.test(buffer))
  if (!type) throw new HttpError(415, '仅支持 PNG / JPG / GIF / WebP 图片')

  const name = `${Date.now()}-${randomBytes(4).toString('hex')}.${type.ext}`
  await mkdir(IMAGES_DIR, { recursive: true })
  await writeFile(path.join(IMAGES_DIR, name), buffer)
  return json(res, 201, { url: `/images/${name}` })
}

/** 本地预览 /images/*：直接读盘返回。Vite 的 public 静态中间件在启动时缓存文件清单，运行中新上传的图片会 404；线上由 Pages 直接托管 public/，不走这里 */
const IMAGE_CONTENT_TYPES = { png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' }

// 编辑页路径：/edit（目录）、/edit/new（新增）、/edit/{id}（单篇唯一路径）
const EDIT_PAGE_PATHNAME = /^\/edit(?:\/(?:new|\d+))?\/?$/

/** /edit 的深层路径直接返回 edit.html，路径里的编号由前端解析（Vite 的 mpa 回退只认 /edit） */
async function serveEditPage(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, '不支持的请求方法')
  const body = Buffer.from(await readFile(path.join(ROOT, 'edit.html'), 'utf8'))
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': body.length })
  res.end(req.method === 'HEAD' ? undefined : body)
}

async function serveImage(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, '不支持的请求方法')
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  const filePath = path.normalize(path.join(IMAGES_DIR, pathname.slice('/images/'.length)))
  if (!filePath.startsWith(IMAGES_DIR + path.sep)) throw new HttpError(404, '图片不存在')

  const contentType = IMAGE_CONTENT_TYPES[path.extname(filePath).slice(1).toLowerCase()]
  let stats
  try {
    stats = await stat(filePath)
  } catch {
    throw new HttpError(404, '图片不存在')
  }
  if (!stats.isFile() || !contentType) throw new HttpError(404, '图片不存在')

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stats.size,
    'Cache-Control': 'no-cache',
  })
  createReadStream(filePath).pipe(res)
}

async function handleApi(req, res) {
  const { pathname } = new URL(req.url, 'http://localhost')
  const segments = pathname.split('/').filter(Boolean) // ['api', 'posts'|'images', id?]
  if (segments[0] !== 'api' || segments.length > 3) {
    throw new HttpError(404, '接口不存在')
  }

  if (segments[1] === 'images') {
    if (segments.length !== 2) throw new HttpError(404, '接口不存在')
    return handleImageUpload(req, res)
  }

  if (segments[1] !== 'posts') throw new HttpError(404, '接口不存在')
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
  if (req.url.startsWith('/images/')) {
    serveImage(req, res).catch(err => {
      const status = err instanceof HttpError ? err.status : 500
      if (status === 500) console.error(err)
      res.writeHead(status).end()
    })
    return
  }
  if (EDIT_PAGE_PATHNAME.test(new URL(req.url, 'http://localhost').pathname)) {
    serveEditPage(req, res).catch(err => {
      const status = err instanceof HttpError ? err.status : 500
      if (status === 500) console.error(err)
      res.writeHead(status).end()
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
  console.log(`  编辑界面：http://localhost:${PORT}/edit（每篇博客可用 /edit/{编号} 直达）`)
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
