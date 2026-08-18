function pad(n) {
  return String(n).padStart(2, '0')
}

/** ISO 时间 -> 2026-08-17 */
export function formatDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** ISO 时间 -> 2026-08-17 14:30 */
export function formatDateTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${formatDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
