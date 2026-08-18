import { useEffect, useRef, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, SearchIcon } from './icons.jsx'

/** 移除已有高亮，把 mark 还原为普通文本 */
function clearHighlights(root) {
  if (!root) return
  root.querySelectorAll('mark.search-hit').forEach(mark => {
    const parent = mark.parentNode
    parent.replaceChild(document.createTextNode(mark.textContent), mark)
    parent.normalize()
  })
}

/** 在容器的文本节点里包裹所有命中词，返回 mark 元素列表 */
function highlightKeyword(root, keyword) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: node =>
      node.parentElement.closest('mark.search-hit, script, style')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  })
  const targets = []
  while (walker.nextNode()) {
    if (walker.currentNode.nodeValue.toLowerCase().includes(keyword)) targets.push(walker.currentNode)
  }
  const marks = []
  for (const node of targets) {
    const text = node.nodeValue
    const lower = text.toLowerCase()
    const fragment = document.createDocumentFragment()
    let pos = 0
    let at = lower.indexOf(keyword)
    while (at !== -1) {
      if (at > pos) fragment.appendChild(document.createTextNode(text.slice(pos, at)))
      const mark = document.createElement('mark')
      mark.className = 'search-hit'
      mark.textContent = text.slice(at, at + keyword.length)
      fragment.appendChild(mark)
      marks.push(mark)
      pos = at + keyword.length
      at = lower.indexOf(keyword, pos)
    }
    if (pos < text.length) fragment.appendChild(document.createTextNode(text.slice(pos)))
    node.parentNode.replaceChild(fragment, node)
  }
  return marks
}

/**
 * 当前文章的页内搜索：点击搜索图标展开输入框，
 * 高亮所有命中词，回车 / 箭头在命中词之间跳转。
 * targetRef 指向包含 Markdown 渲染结果的文章容器。
 */
export default function ContentSearch({ targetRef }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const [total, setTotal] = useState(0)
  const marksRef = useRef([])

  // 组件卸载时清理高亮
  useEffect(() => () => clearHighlights(targetRef.current), [targetRef])

  // 关键词变化：清掉旧高亮，重新标记所有命中词
  useEffect(() => {
    const root = targetRef.current
    if (!root) return
    clearHighlights(root)
    const keyword = query.trim().toLowerCase()
    marksRef.current = keyword ? highlightKeyword(root, keyword) : []
    setTotal(marksRef.current.length)
    setIndex(0)
  }, [query, targetRef])

  // 当前命中项：加强高亮并滚动到可视区
  useEffect(() => {
    marksRef.current.forEach(mark => mark.classList.remove('current'))
    const mark = marksRef.current[index]
    if (mark) {
      mark.classList.add('current')
      mark.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [index, query])

  const step = delta => {
    if (total > 0) setIndex(current => (current + delta + total) % total)
  }

  const close = () => {
    setOpen(false)
    setQuery('')
  }

  return open ? (
    <div className="content-search-bar">
      <input
        type="text"
        autoFocus
        value={query}
        placeholder="搜索本篇内容"
        onChange={event => setQuery(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter') step(1)
          if (event.key === 'Escape') close()
        }}
      />
      <span className="content-search-count">
        {total > 0 ? `${index + 1}/${total}` : query.trim() ? '无结果' : ''}
      </span>
      <button type="button" className="icon-btn" title="上一个" disabled={!total} onClick={() => step(-1)}>
        <ChevronLeftIcon />
      </button>
      <button type="button" className="icon-btn" title="下一个" disabled={!total} onClick={() => step(1)}>
        <ChevronRightIcon />
      </button>
      <button type="button" className="icon-btn" title="关闭搜索" onClick={close}>
        <CloseIcon />
      </button>
    </div>
  ) : (
    <button type="button" className="btn" title="搜索本篇内容" onClick={() => setOpen(true)}>
      <SearchIcon />
    </button>
  )
}
