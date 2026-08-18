import test from 'node:test'
import assert from 'node:assert/strict'
import { parsePostFile, serializePost } from '../src/shared/frontmatter.js'

const sample = {
  id: 3,
  title: '标题：带冒号',
  createdAt: '2026-08-16T02:03:04.000Z',
  updatedAt: '2026-08-17T05:06:07.000Z',
  content: '## 小标题\n\n正文 **加粗**。',
}

test('序列化后再解析，内容一致', () => {
  const parsed = parsePostFile(serializePost(sample))
  assert.deepEqual(parsed, sample)
})

test('解析标准博客文件', () => {
  const raw = [
    '---',
    'id: 1',
    'title: 第一篇',
    'createdAt: 2026-08-01T00:00:00.000Z',
    'updatedAt: 2026-08-02T00:00:00.000Z',
    '---',
    '',
    '你好，世界。',
  ].join('\n')
  assert.deepEqual(parsePostFile(raw), {
    id: 1,
    title: '第一篇',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-02T00:00:00.000Z',
    content: '你好，世界。',
  })
})

test('缺少 frontmatter 时报错', () => {
  assert.throws(() => parsePostFile('只有正文'), /frontmatter/)
})

test('frontmatter 未闭合时报错', () => {
  assert.throws(() => parsePostFile('---\nid: 1\n'), /闭合/)
})

test('id 非正整数时报错', () => {
  const raw = '---\nid: abc\ntitle: t\ncreatedAt: 2026-08-01T00:00:00.000Z\nupdatedAt: 2026-08-01T00:00:00.000Z\n---\n\n正文'
  assert.throws(() => parsePostFile(raw), /id/)
})

test('标题为空时报错', () => {
  const raw = '---\nid: 1\ntitle: \ncreatedAt: 2026-08-01T00:00:00.000Z\nupdatedAt: 2026-08-01T00:00:00.000Z\n---\n\n正文'
  assert.throws(() => parsePostFile(raw), /title/)
})

test('时间是非法值时报错', () => {
  const raw = '---\nid: 1\ntitle: t\ncreatedAt: 不是时间\nupdatedAt: 2026-08-01T00:00:00.000Z\n---\n\n正文'
  assert.throws(() => parsePostFile(raw), /createdAt/)
})
