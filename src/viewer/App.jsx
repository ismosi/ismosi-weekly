import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import posts from '../generated/posts.json'
import SiteHeader from '../shared/SiteHeader.jsx'
import PostList from '../shared/PostList.jsx'
import Markdown from '../shared/Markdown.jsx'
import PostFooter from '../shared/PostFooter.jsx'
import ContentSearch from '../shared/ContentSearch.jsx'
import Toc from '../shared/Toc.jsx'
import { extractToc, scrollToHeading } from '../shared/toc.js'
import { useSidebar } from '../shared/useSidebar.js'
import { editHref, parseEditRoute } from '../shared/route.js'
import { formatDateTime } from '../shared/date.js'
import { ChevronRightIcon, SearchIcon } from '../shared/icons.jsx'

/** 展示页：只读浏览 + 搜索（列表筛选 + 篇内搜索） */
export default function App() {
  const [search, setSearch] = useState('')
  // 地址栏路由 /edit/{id}：本地编辑页与线上 404 回退页共用同一套路径规则
  const [route, setRoute] = useState(() => parseEditRoute(window.location.pathname))
  const [selectedId, setSelectedId] = useState(route?.id ?? posts[0]?.id ?? null)
  const { width, collapsed, setCollapsed, startResize } = useSidebar()
  const articleRef = useRef(null)

  const visible = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return posts
    return posts.filter(post =>
      `${post.title}\n${post.content}`.toLowerCase().includes(keyword),
    )
  }, [search])

  // 浏览器前进/后退：按新地址重新选中
  useEffect(() => {
    const onPopState = () => {
      const next = parseEditRoute(window.location.pathname)
      setRoute(next)
      if (next?.id != null) setSelectedId(next.id)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  /** 选中一篇博客并同步地址到 /edit/{id}（列表点击、底部上一篇/下一篇共用） */
  const navigate = useCallback(id => {
    setSelectedId(id)
    setRoute({ id })
    const href = editHref(window.location.pathname, id)
    if (window.location.pathname !== href) history.pushState(null, '', href)
  }, [])

  const selected = visible.find(post => post.id === selectedId) ?? visible[0] ?? null
  // 深链编号不存在时给出提示，而不是悄悄回落到第一篇
  const notFoundId = route?.id != null && !posts.some(post => post.id === route.id) ? route.id : null
  const toc = useMemo(() => (selected ? extractToc(selected.content) : []), [selected])
  const jumpToHeading = useCallback(item => scrollToHeading(articleRef.current, item.id), [])

  return (
    <div className="app">
      <aside
        className={`sidebar${collapsed ? ' collapsed' : ''}`}
        style={{ width: collapsed ? 0 : width }}
      >
        <div className="sidebar-fixed" style={{ width }}>
          <SiteHeader onCollapse={() => setCollapsed(true)} />
          <div className="sidebar-header">
            <div className="search-box">
              <span className="search-icon">
                <SearchIcon />
              </span>
              <input
                type="text"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="搜索标题或正文"
              />
            </div>
          </div>
          <PostList posts={visible} selectedId={selected?.id ?? null} onSelect={navigate} />
        </div>
      </aside>
      {!collapsed && <div className="sidebar-resizer" title="拖动调整列表宽度" onMouseDown={startResize} />}
      {collapsed && (
        <button
          type="button"
          className="sidebar-expand"
          title="展开博客列表"
          onClick={() => setCollapsed(false)}
        >
          <ChevronRightIcon />
        </button>
      )}
      <main className="content-pane">
        <Toc items={toc} onJump={jumpToHeading} />
        {notFoundId ? (
          <div className="empty">博客 #{notFoundId} 不存在</div>
        ) : selected ? (
          <article ref={articleRef} className="content-inner">
            <header className="content-header">
              <div className="header-left">
                <span className="post-id">#{selected.id}</span>
                <ContentSearch key={selected.id} targetRef={articleRef} />
              </div>
              <div className="post-times">
                <span className="created-at">创建于 {formatDateTime(selected.createdAt)}</span>
                {selected.updatedAt && (
                  <span className="edited-at">编辑于 {formatDateTime(selected.updatedAt)}</span>
                )}
              </div>
            </header>
            <h1 className="content-title">{selected.title}</h1>
            <Markdown text={selected.content} />
            <PostFooter posts={posts} postId={selected.id} onNavigate={navigate} />
          </article>
        ) : (
          <div className="empty">
            {search ? '没有匹配的博客，换个关键词试试' : '还没有博客'}
          </div>
        )}
      </main>
    </div>
  )
}
