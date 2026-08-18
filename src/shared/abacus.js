/**
 * Abacus 计数服务（https://abacus.jasoncameron.dev）的极薄封装。
 * 用于「加油 / 点赞 / 小眼睛」的全局共享计数：
 * - GET  /get/{ns}/{key}  读取计数（键不存在返回 404，视为 0）
 * - GET  /hit/{ns}/{key}  自增 1 并返回新值
 * 注意：键名只允许字母、数字、下划线、中划线、点（3~64 位），冒号等符号会被拒绝。
 */

const NAMESPACE = 'ismosi-weekly'
const BASE_URL = 'https://abacus.jasoncameron.dev'

function endpoint(action, key) {
  return `${BASE_URL}/${action}/${NAMESPACE}/${encodeURIComponent(key)}`
}

/** 文章互动计数的键：kind 为 cheer | like | eye */
export function postCounterKey(postId, kind) {
  return `post-${postId}-${kind}`
}

/** 读取计数；键尚不存在时返回 0 */
export async function fetchCount(key) {
  const res = await fetch(endpoint('get', key))
  if (res.status === 404) return 0
  if (!res.ok) throw new Error(`读取计数失败（${res.status}）`)
  const data = await res.json()
  return data.value ?? 0
}

/** 计数 +1，返回服务端的新值 */
export async function hitCount(key) {
  const res = await fetch(endpoint('hit', key))
  if (!res.ok) throw new Error(`更新计数失败（${res.status}）`)
  const data = await res.json()
  return data.value ?? 0
}
