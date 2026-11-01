/**
 * /edit/{id} 博客路由（编辑页与展示页共用）。
 * - 本地编辑页：/edit 目录、/edit/new 新增、/edit/{id} 单篇
 * - 线上 Pages：/edit/{id} 由 404.html 回退到展示页，仅提供只读阅读视图
 * 站点可能部署在 Pages 子路径（如 /repo/），因此拼接路径前先从当前 pathname 推导站点根。
 */

/** 解析路径里的博客路由：/edit/{id} 返回 { id }，/edit/new 返回 { isNew: true }，其余返回 null */
export function parseEditRoute(pathname) {
  const post = /\/edit\/(\d+)\/?$/.exec(pathname)
  if (post) return { id: Number(post[1]) }
  if (/\/edit\/new\/?$/.test(pathname)) return { isNew: true }
  return null
}

/** 站点根路径：本地是 /，Pages 子路径部署时是 /repo/（即 /edit/ 之前的部分） */
export function siteBase(pathname) {
  const routeIndex = pathname.indexOf('/edit/')
  const withoutRoute = routeIndex >= 0 ? pathname.slice(0, routeIndex + 1) : pathname
  return withoutRoute.slice(0, withoutRoute.lastIndexOf('/') + 1)
}

/** 单篇博客的唯一路径：{站点根}/edit/{id} */
export function editHref(pathname, id) {
  return `${siteBase(pathname)}edit/${id}`
}

/** 博客目录路径：{站点根}/edit（编辑页用；展示页的目录就是站点根本身） */
export function editIndexPathname(pathname) {
  return `${siteBase(pathname)}edit`
}
