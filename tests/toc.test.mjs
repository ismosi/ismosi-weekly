import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTocTree, extractToc, flattenTocTree, lineToOffset } from '../src/shared/toc.js'

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

const treeOf = text => buildTocTree(extractToc(text))
const idsOf = rows => rows.map(row => row.id)

/**
 * 一级标题
 *   二级-a
 *     三级
 *   二级-b
 *   二级-a（重复）
 */
const tree = treeOf(content)

test('按层级组装目录树，同标题不同层级各自挂靠最近上级', () => {
  assert.deepEqual(tree[0].id, '一级标题')
  assert.deepEqual(
    tree[0].children.map(node => [node.id, idsOf(node.children)]),
    [
      ['二级-a', ['三级']],
      ['二级-b', []],
      ['二级-a-2', []],
    ],
  )
})

test('层级跳级（## 后直接 ####）就近挂靠上级', () => {
  const tree = treeOf(['## 甲', '', '#### 乙', '', '## 丙'].join('\n'))
  assert.deepEqual(tree.map(node => [node.id, idsOf(node.children)]), [
    ['甲', ['乙']],
    ['丙', []],
  ])
})

const noCollapsed = flattenTocTree(tree, new Set())

test('全部展开时按嵌套顺序展平，depth 为相对顶层的真实深度', () => {
  assert.deepEqual(
    noCollapsed.map(row => [row.id, row.depth]),
    [
      ['一级标题', 0],
      ['二级-a', 1],
      ['三级', 2],
      ['二级-b', 1],
      ['二级-a-2', 1],
    ],
  )
})

test('折叠父目录只隐藏子树，孙级折叠状态不受影响', () => {
  // 结构：甲 → 乙 → 丙 → 丁，甲 → 戊
  const nested = treeOf(['# 甲', '', '## 乙', '', '### 丙', '', '#### 丁', '', '## 戊'].join('\n'))

  // 父目录自身保持可见（其行上的箭头用于再次展开），仅子孙被隐藏
  const collapsed = flattenTocTree(nested, new Set(['乙']))
  assert.deepEqual(idsOf(collapsed), ['甲', '乙', '戊'])

  // 同时折叠「乙」与其子「丙」，再单独展开「乙」：
  // 「丙」自身的折叠标记未被重置，「丁」仍保持隐藏
  const withGrandchild = flattenTocTree(nested, new Set(['乙', '丙']))
  assert.deepEqual(idsOf(withGrandchild), ['甲', '乙', '戊'])
  const afterReexpand = flattenTocTree(nested, new Set(['丙']))
  // 「丙」自身仍在列表中（维持折叠形态，其行上的箭头可再展开「丁」），只有「丁」保持隐藏
  assert.deepEqual(idsOf(afterReexpand), ['甲', '乙', '丙', '戊'])

  // 全部展开后「丁」恢复可见；叶子标题不可折叠，折叠集合里有它也不影响
  assert.deepEqual(idsOf(flattenTocTree(nested, new Set())), ['甲', '乙', '丙', '丁', '戊'])
  assert.deepEqual(idsOf(flattenTocTree(nested, new Set(['丁']))), ['甲', '乙', '丙', '丁', '戊'])
})

test('折叠后父目录自身仍在目录中，可再次展开', () => {
  const collapsed = flattenTocTree(tree, new Set(['一级标题']))
  assert.deepEqual(idsOf(collapsed), ['一级标题'])
})
