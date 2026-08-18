import { useMemo, useRef, useState } from 'react'
import posts from '../generated/posts.json'
import SiteHeader from '../shared/SiteHeader.jsx'
import PostList from '../shared/PostList.jsx'
import Markdown from '../shared/Markdown.jsx'
import PostFooter from '../shared/PostFooter.jsx'
import ContentSearch from '../shared/ContentSearch.jsx'
import { useSidebar } from '../shared/useSidebar.js'
import { formatDateTime } from '../shared/date.js'
import { ChevronRightIcon, SearchIcon } from '../shared/icons.jsx'

/** 展示页：只读浏览 + 搜索（列表筛选 + 篇内搜索） */
export default function App() {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(posts[0]?.id ?? null)
  const { width, collapsed, setCollapsed, startResize } = useSidebar()
  const articleRef = useRef(null)

  const visible = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return posts
    return posts.filter(post =>
      `${post.title}\n${post.content}`.toLowerCase().includes(keyword),
    )
  }, [search])

  const selected = visible.find(post => post.id === selectedId) ?? visible[0] ?? null

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
          <PostList posts={visible} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
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
        {selected ? (
          <article ref={articleRef} className="content-inner">
            <header className="content-header">
              <div className="header-left">
                <span className="post-id">#{selected.id}</span>
                <ContentSearch key={selected.id} targetRef={articleRef} />
              </div>
              <span className="edited-at">编辑于 {formatDateTime(selected.updatedAt)}</span>
            </header>
            <h1 className="content-title">{selected.title}</h1>
            <Markdown text={selected.content} />
            <PostFooter posts={posts} postId={selected.id} onNavigate={setSelectedId} />
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
