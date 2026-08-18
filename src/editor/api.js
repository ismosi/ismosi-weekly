async function request(pathname, { method = 'GET', body } = {}) {
  const res = await fetch(pathname, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `请求失败（${res.status}）`)
  return data
}

/** 本地编辑服务的 API 客户端 */
export default {
  list: () => request('/api/posts').then(data => data.posts),
  create: (title, content) =>
    request('/api/posts', { method: 'POST', body: { title, content } }).then(data => data.post),
  update: (id, title, content) =>
    request(`/api/posts/${id}`, { method: 'PUT', body: { title, content } }).then(
      data => data.post,
    ),
  remove: id => request(`/api/posts/${id}`, { method: 'DELETE' }),
}
