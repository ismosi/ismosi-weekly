/**
 * 自动保存状态的展示文案（纯函数，供编辑页状态栏与单元测试使用）。
 * 状态取值与 useAutosave.js 里 setStatus 的值一一对应。
 */

const CLOCK_OPTIONS = { hour12: false }

/** 时间戳 → HH:MM:SS（如 09:05:03） */
export function formatSavedAt(savedAt) {
  return new Date(savedAt).toLocaleTimeString('zh-CN', CLOCK_OPTIONS)
}

/** 保存状态 → 界面文案；idle 且从未保存过返回空串（不占位显示） */
export function saveStatusText(status, savedAt = null) {
  switch (status) {
    case 'pending':
      return '待保存…'
    case 'saving':
      return '保存中…'
    case 'saved':
    case 'idle':
      return savedAt ? `已保存 ${formatSavedAt(savedAt)}` : ''
    case 'error':
      return '保存失败，点击重试'
    case 'empty-title':
      return '标题为空，暂未保存'
    default:
      return ''
  }
}
