import { useEffect, useState } from 'react'
import { ChevronRightIcon } from './icons.jsx'
import { useTocWidth } from './useTocWidth.js'

/** 文章目录：展示正文所有标题，点击跳转到对应位置；默认展开，折叠不做持久化 */
export default function Toc({ items, onJump }) {
  const [open, setOpen] = useState(true)
  const { width, startResize } = useTocWidth()
  // 被省略号截断的条目悬停时，展示完整标题的轻弹窗
  const [tip, setTip] = useState(null)
  // 当前被点击的条目：持续保持与悬停一致的蓝色高亮，直到点击其他条目
  const [activeId, setActiveId] = useState(null)

  // 目录整体变化（切换博客/编辑改动）后清除高亮，避免误亮未经点击的条目
  useEffect(() => setActiveId(null), [items])

  // 正文没有标题时整个目录（含折叠后的展开把手）都不显示
  if (items.length === 0) return null

  if (!open) {
    return (
      <button type="button" className="toc-expand" title="展开目录" onClick={() => setOpen(true)}>
        目录
      </button>
    )
  }

  // 层级深度相对全文最小标题级别：父子目录靠字号与缩进区分
  const minLevel = Math.min(...items.map(item => item.level))

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
          {items.map(item => {
            const depth = item.level - minLevel
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`toc-item${item.id === activeId ? ' active' : ''}`}
                  style={{
                    fontSize: `${Math.max(12, 15 - depth)}px`,
                    paddingLeft: 4 + depth * 14,
                  }}
                  onMouseEnter={event => showTip(item, event.currentTarget)}
                  onMouseLeave={() => setTip(null)}
                  onClick={() => {
                    setTip(null)
                    setActiveId(item.id)
                    onJump(item)
                  }}
                >
                  {item.text}
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
