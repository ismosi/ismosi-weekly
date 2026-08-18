import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import api from './api.js'
import SiteHeader from '../shared/SiteHeader.jsx'
import PostList from '../shared/PostList.jsx'
import Markdown from '../shared/Markdown.jsx'
import PostFooter from '../shared/PostFooter.jsx'
import ContentSearch from '../shared/ContentSearch.jsx'
import { useSidebar } from '../shared/useSidebar.js'
import { formatDateTime } from '../shared/date.js'
import { ChevronRightIcon, EditIcon, PlusIcon, SearchIcon } from '../shared/icons.jsx'

const EMPTY_DRAFT = { id: null, title: '', content: '' }

/** 编辑页：新增 / 编辑 / 删除 / 搜索，支持 Markdown 编辑与预览 */
export default function App() {
  const [posts, setPosts] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState(null) // 非空即处于编辑状态；id 为 null 表示新博客
  const [preview, setPreview] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { width, collapsed, setCollapsed, startResize } = useSidebar()

  useEffect(() => {
    api
      .list()
      .then(setPosts)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // 进入编辑时自动折叠列表；保存或取消回到阅读时自动展开
  useEffect(() => {
    setCollapsed(Boolean(draft))
  }, [draft, setCollapsed])

  const visible = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return posts
    return posts.filter(post =>
      `${post.title}\n${post.content}`.toLowerCase().includes(keyword),
    )
  }, [posts, search])

  const selected = useMemo(
    () => posts.find(post => post.id === selectedId) ?? null,
    [posts, selectedId],
  )

  const startCreate = useCallback(() => {
    setError(null)
    setPreview(false)
    setDraft({ ...EMPTY_DRAFT })
  }, [])

  const startEdit = useCallback(() => {
    if (!selected) return
    setError(null)
    setPreview(false)
    setDraft({ id: selected.id, title: selected.title, content: selected.content })
  }, [selected])

  const saveDraft = async () => {
    if (!draft.title.trim()) {
      setError('标题不能为空')
      return
    }
    try {
      if (draft.id === null) {
        const post = await api.create(draft.title, draft.content)
        setPosts(prev => [post, ...prev]) // 新博客创建时间最新，排在最上
        setSelectedId(post.id)
      } else {
        const post = await api.update(draft.id, draft.title, draft.content)
        setPosts(prev => prev.map(item => (item.id === post.id ? post : item)))
      }
      setError(null)
      setDraft(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async post => {
    if (!window.confirm(`确定删除博客 #${post.id}「${post.title}」吗？\n文件会从 content/ 目录移除。`)) {
      return
    }
    try {
      await api.remove(post.id)
      setPosts(prev => prev.filter(item => item.id !== post.id))
      if (selectedId === post.id) setSelectedId(null)
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="app">
      <aside
        className={`sidebar${collapsed ? ' collapsed' : ''}`}
        style={{ width: collapsed ? 0 : width }}
      >
        <div className="sidebar-fixed" style={{ width }}>
          <SiteHeader onCollapse={() => setCollapsed(true)} />
          <div className="sidebar-header">
            <div className="toolbar">
              <button type="button" className="btn-add" title="新增博客" onClick={startCreate}>
                <PlusIcon />
              </button>
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
          </div>
          {error && <div className="banner-error">{error}</div>}
          {loading ? (
            <div className="empty">加载中…</div>
          ) : (
            <PostList
              posts={visible}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onDelete={remove}
            />
          )}
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
      {draft ? (
        <EditorPane
          draft={draft}
          preview={preview}
          setPreview={setPreview}
          onChange={setDraft}
          onSave={saveDraft}
          onCancel={() => setDraft(null)}
        />
      ) : (
        <ContentPane post={selected} posts={posts} onEdit={startEdit} onNavigate={setSelectedId} />
      )}
    </div>
  )
}

/** 阅读视图：左上角编辑按钮 + 篇内搜索，右上角显示编辑日期 */
function ContentPane({ post, posts, onEdit, onNavigate }) {
  const articleRef = useRef(null)
  return (
    <main className="content-pane">
      {post ? (
        <article ref={articleRef} className="content-inner">
          <header className="content-header">
            <div className="header-left">
              <button type="button" className="btn" onClick={onEdit}>
                <EditIcon />
                编辑
              </button>
              <ContentSearch key={post.id} targetRef={articleRef} />
            </div>
            <span className="edited-at">编辑于 {formatDateTime(post.updatedAt)}</span>
          </header>
          <h1 className="content-title">{post.title}</h1>
          <Markdown text={post.content} />
          <PostFooter posts={posts} postId={post.id} onNavigate={onNavigate} />
        </article>
      ) : (
        <div className="empty">从左侧选择一篇博客，或点击 ＋ 新增</div>
      )}
    </main>
  )
}

/** 编辑视图：标题 + 编辑/预览切换 + 保存/取消 */
function EditorPane({ draft, preview, setPreview, onChange, onSave, onCancel }) {
  return (
    <main className="content-pane">
      <div className="editor-inner">
        <div>
          <label className="field-label" htmlFor="post-title">
            标题
          </label>
          <input
            id="post-title"
            type="text"
            className="title-input"
            value={draft.title}
            onChange={event => onChange({ ...draft, title: event.target.value })}
            placeholder="输入博客标题"
            autoFocus={draft.id === null}
          />
        </div>
        <div className="editor-toolbar">
          <button
            type="button"
            className={`tab${preview ? '' : ' active'}`}
            onClick={() => setPreview(false)}
          >
            编辑
          </button>
          <button
            type="button"
            className={`tab${preview ? ' active' : ''}`}
            onClick={() => setPreview(true)}
          >
            预览
          </button>
        </div>
        {preview ? (
          <div className="preview-box">
            <Markdown text={draft.content} />
          </div>
        ) : (
          <textarea
            className="markdown-input"
            value={draft.content}
            onChange={event => onChange({ ...draft, content: event.target.value })}
            placeholder="用 Markdown 写点什么…"
            spellCheck={false}
          />
        )}
        <footer className="editor-footer">
          <button type="button" className="btn" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="btn btn-primary" onClick={onSave}>
            保存
          </button>
        </footer>
      </div>
    </main>
  )
}
