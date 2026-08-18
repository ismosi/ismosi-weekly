import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { nextPostId, padId, scanPosts, writePostsJson } from '../src/shared/posts.js'
import { serializePost } from '../src/shared/frontmatter.js'

function makePost(id, createdAt, title = `第 ${id} 篇`) {
  return {
    id,
    title,
    createdAt,
    updatedAt: createdAt,
    content: `# ${title}\n\n正文。`,
  }
}

async function makeDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'blog-test-'))
}

test('padId 生成四位编号文件名', () => {
  assert.equal(padId(1), '0001.md')
  assert.equal(padId(123), '0123.md')
  assert.equal(padId(12345), '12345.md')
})

test('nextPostId 返回最大编号加一', () => {
  assert.equal(nextPostId([]), 1)
  assert.equal(nextPostId([{ id: 1 }, { id: 3 }]), 4)
})

test('scanPosts 按创建时间倒序，同一时间按编号倒序', async () => {
  const dir = await makeDir()
  await fs.writeFile(path.join(dir, padId(1)), serializePost(makePost(1, '2026-08-01T00:00:00.000Z')))
  await fs.writeFile(path.join(dir, padId(2)), serializePost(makePost(2, '2026-08-10T00:00:00.000Z')))
  await fs.writeFile(path.join(dir, padId(3)), serializePost(makePost(3, '2026-08-10T00:00:00.000Z')))
  const posts = await scanPosts(dir)
  assert.deepEqual(posts.map(post => post.id), [3, 2, 1])
})

test('scanPosts 忽略非 md 文件，目录不存在时返回空数组', async () => {
  const dir = await makeDir()
  await fs.writeFile(path.join(dir, 'notes.txt'), '不是博客')
  assert.deepEqual(await scanPosts(dir), [])
  assert.deepEqual(await scanPosts(path.join(dir, '不存在')), [])
})

test('writePostsJson 生成倒序清单 JSON', async () => {
  const dir = await makeDir()
  await fs.writeFile(path.join(dir, padId(1)), serializePost(makePost(1, '2026-08-01T00:00:00.000Z')))
  await fs.writeFile(path.join(dir, padId(2)), serializePost(makePost(2, '2026-08-10T00:00:00.000Z')))
  const outFile = path.join(dir, 'out', 'posts.json')
  const posts = await writePostsJson(dir, outFile)
  const json = JSON.parse(await fs.readFile(outFile, 'utf8'))
  assert.deepEqual(json, posts)
  assert.deepEqual(json.map(post => post.id), [2, 1])
  assert.ok(json[0].content.includes('# 第 2 篇'))
})
