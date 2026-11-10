import test from 'node:test'
import assert from 'node:assert/strict'
import { extractToc, lineToOffset } from '../src/shared/toc.js'

const content = [
  '# 一级标题',
  '',
  '正文段落。',
  '',
  '## 二级 A',
  '',
  '### 三级',
  '',
  '## 二级 B',
  '',
  '```',
  '# 代码块里不是标题',
  '```',
  '',
  '## 二级 A',
].join('\n')

test('按层级提取全部标题，记录行号，代码块内 # 不算标题', () => {
  const toc = extractToc(content)
  assert.deepEqual(
    toc.map(item => [item.level, item.text, item.line]),
    [
      [1, '一级标题', 0],
      [2, '二级 A', 4],
      [3, '三级', 6],
      [2, '二级 B', 8],
      [2, '二级 A', 14],
    ],
  )
})

test('重复标题 id 自动去重，与渲染锚点同源', () => {
  const toc = extractToc(content)
  assert.deepEqual(toc.map(item => item.id), ['一级标题', '二级-a', '三级', '二级-b', '二级-a-2'])
})

test('标题文字忽略行内格式，只保留纯文本', () => {
  const toc = extractToc('## **加粗** 与 `代码` 和 [链接](https://example.com)')
  assert.equal(toc[0].text, '加粗 与 代码 和 链接')
})

test('无标题返回空数组', () => {
  assert.deepEqual(extractToc('只有正文，没有标题。'), [])
  assert.deepEqual(extractToc(null), [])
})

test('lineToOffset 计算指定行的字符偏移，越界时收敛到文末', () => {
  assert.equal(lineToOffset('a\nbc\nd', 0), 0)
  assert.equal(lineToOffset('a\nbc\nd', 2), 5)
  assert.equal(lineToOffset('a\nbc\nd', 99), 6)
})
