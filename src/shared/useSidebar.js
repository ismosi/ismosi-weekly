import { useCallback, useEffect, useState } from 'react'

// key 带 v2：默认宽度改为 325 时升级 key，避免旧存档宽度覆盖新默认值
const STORAGE_KEY = 'sidebar-width-v2'
const DEFAULT_WIDTH = 325
const MIN_WIDTH = 140
const MAX_WIDTH = 560

function clampWidth(value) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(value)))
}

/**
 * 侧栏宽度与折叠状态（展示页与编辑页共用）。
 * - 宽度默认 325px，拖动右边框调整，localStorage 持久化
 * - collapsed 由页面控制：手动折叠/展开，或进入/退出编辑时自动切换
 */
export function useSidebar() {
  const [width, setWidth] = useState(() => {
    const saved = Number(localStorage.getItem(STORAGE_KEY))
    return Number.isFinite(saved) && saved > 0 ? clampWidth(saved) : DEFAULT_WIDTH
  })
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(width))
  }, [width])

  /** 按住侧栏右边框拖动：以按下位置为基准增减宽度 */
  const startResize = useCallback(
    event => {
      event.preventDefault()
      const startX = event.clientX
      const startWidth = width
      const onMove = ev => setWidth(clampWidth(startWidth + ev.clientX - startX))
      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        document.body.classList.remove('resizing')
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
      document.body.classList.add('resizing') // 拖动期间禁用文本选中
    },
    [width],
  )

  return { width, collapsed, setCollapsed, startResize }
}
