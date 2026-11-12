import { useCallback, useEffect, useState } from 'react'

// key 带 v3：默认宽度随折叠图标预留宽度 +16px 时升级 key，避免旧存档宽度覆盖新默认值
const STORAGE_KEY = 'toc-width-v3'
const DEFAULT_WIDTH = 172
const MIN_WIDTH = 156
const MAX_WIDTH = 416

function clampWidth(value) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(value)))
}

/**
 * 目录面板宽度（编辑页与展示页共用），拖动面板左缘调整，localStorage 持久化。
 * 面板吸视口右侧：左缘向左拖 = 变宽，向右拖 = 变窄。
 */
export function useTocWidth() {
  const [width, setWidth] = useState(() => {
    const saved = Number(localStorage.getItem(STORAGE_KEY))
    return Number.isFinite(saved) && saved > 0 ? clampWidth(saved) : DEFAULT_WIDTH
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(width))
  }, [width])

  /** 按住目录左缘拖动：以按下位置为基准增减宽度 */
  const startResize = useCallback(
    event => {
      event.preventDefault()
      const startX = event.clientX
      const startWidth = width
      const onMove = ev => setWidth(clampWidth(startWidth + startX - ev.clientX))
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

  return { width, startResize }
}
