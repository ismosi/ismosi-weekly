import { useEffect, useMemo, useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon } from './icons.jsx'
import { useTocWidth } from './useTocWidth.js'
import { buildTocTree, flattenTocTree } from './toc.js'

/** 文章目录：展示正文所有标题，点击跳转到对应位置；面板默认展开，折叠不做持久化 */
export default function Toc({ items, onJump }) {
  const [open, setOpen] = useState(true)
  const { width, startResize } = useTocWidth()
  // 被省略号截断的条目悬停时，展示完整标题的轻弹窗
  const [tip, setTip] = useState(null)
  // 当前被点击的条目：持续保持与悬停一致的蓝色高亮，直到点击其他条目
  const [activeId, setActiveId] = useState(null)
  // 已折叠父目录的 id 集合：按 id 记忆，编辑正文导致 items 重建时各节点的折叠状态不丢
  const [collapsedIds, setCollapsedIds] = useState(() => new Set())

  // 组装目录树后按折叠状态展平成可见行，depth 即真实嵌套深度
  const tree = useMemo(() => buildTocTree(items), [items])
  const rows = useMemo(() => flattenTocTree(tree, collapsedIds), [tree, collapsedIds])

  // 目录整体变化（切换博客/编辑改动）后清除高亮，避免误亮未经点击的条目；顺带清理已删标题的折叠记忆
  useEffect(() => {
    setActiveId(null)
    setCollapsedIds(prev => {
      const alive = new Set(items.map(item => item.id))
      const next = new Set([...prev].filter(id => alive.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [items])

  // 正文没有标题时整个目录（含折叠后的展开把手）都不显示
  if (items.length === 0) return null

  if (!open) {
    return (
      <button type="button" className="toc-expand" title="展开目录" onClick={() => setOpen(true)}>
        目录
      </button>
    )
  }

  /** 折叠/展开某个父目录的子树；只改它自己的折叠标记，后代节点状态保持不变 */
  const toggleCollapse = id => {
    setCollapsedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /** 悬停条目：只有文字被截断时，在条目上方弹出完整标题；水平位置由 CSS 右对齐决定 */
  const showTip = (item, target) => {
    if (target.scrollWidth <= target.clientWidth) return
    setTip({ text: item.text, top: target.getBoundingClientRect().top - 8 })
  }

  return (
    <>
      <nav className="toc-panel" style={{ width }} aria-label="文章目录">
        <div
          className="toc-resizer"
          title="拖动调整目录宽度"
          onMouseDown={event => {
            setTip(null)
            startResize(event)
          }}
        />
        <div className="toc-header">
          <span className="toc-title">目录</span>
          <button type="button" className="icon-btn" title="折叠目录" onClick={() => setOpen(false)}>
            <ChevronRightIcon />
          </button>
        </div>
        <ul className="toc-list" onScroll={() => setTip(null)}>
          {rows.map(row => {
            const hasChildren = row.children.length > 0
            const collapsed = collapsedIds.has(row.id)
            const indent = 4 + row.depth * 14
            return (
              <li key={row.id}>
                {hasChildren && (
                  <button
                    type="button"
                    className="toc-caret"
                    title={collapsed ? '展开子目录' : '折叠子目录'}
                    aria-expanded={!collapsed}
                    style={{ left: indent }}
                    onClick={event => {
                      // 不触发行点击跳转
                      event.stopPropagation()
                      setTip(null)
                      toggleCollapse(row.id)
                    }}
                  >
                    {collapsed ? <ChevronRightIcon size={12} /> : <ChevronDownIcon size={12} />}
                  </button>
                )}
                <button
                  type="button"
                  className={`toc-item${row.id === activeId ? ' active' : ''}`}
                  style={{
                    fontSize: `${Math.max(12, 15 - row.depth)}px`,
                    // 所有条目统一预留箭头宽度：同层级标题左对齐，箭头浮现/消失都不挤动文字，
                    // 避免父目录标题右移 16px 被误读成更深一层；面板默认宽度已同步 +16px 补偿
                    paddingLeft: indent + 16,
                  }}
                  onMouseEnter={event => showTip(row, event.currentTarget)}
                  onMouseLeave={() => setTip(null)}
                  onClick={() => {
                    setTip(null)
                    setActiveId(row.id)
                    onJump(row)
                  }}
                >
                  {row.text}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
      {tip && (
        <div className="toc-tooltip" style={{ top: tip.top }}>
          {tip.text}
        </div>
      )}
    </>
  )
}
