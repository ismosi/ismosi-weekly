import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import api from './api.js'
import SiteHeader from '../shared/SiteHeader.jsx'
import PostList from '../shared/PostList.jsx'
import Markdown from '../shared/Markdown.jsx'
import PostFooter from '../shared/PostFooter.jsx'
import ContentSearch from '../shared/ContentSearch.jsx'
import { useSidebar } from '../shared/useSidebar.js'
import { editHref, editIndexPathname, parseEditRoute } from '../shared/route.js'
import { formatDateTime } from '../shared/date.js'
import { ChevronRightIcon, EditIcon, PlusIcon, SearchIcon } from '../shared/icons.jsx'

const EMPTY_DRAFT = { id: null, title: '', content: '' }

/** 编辑页：新增 / 编辑 / 删除 / 搜索，支持 Markdown 编辑与预览 */
export default function App() {
  const [posts, setPosts] = useState([])
  // 地址栏路由：/edit/{id}（或 /edit/new），route 是 location.pathname 的镜像
  const [route, setRoute] = useState(() => parseEditRoute(window.location.pathname))
  const [selectedId, setSelectedId] = useState(route?.id ?? null)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState(null) // 非空即处于编辑状态；id 为 null 表示新博客
  const [preview, setPreview] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { width, collapsed, setCollapsed, startResize } = useSidebar()
  const lastHrefRef = useRef(null) // 打开 /edit/new 之前的地址，取消新增时回去

  useEffect(() => {
    api
      .list()
      .then(setPosts)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // 进入编辑时自动折叠列表；保存或取消回到阅读时自动展开。
  // 只在编辑态切换时触发，编辑途中手动展开的列表不会被下一次输入重新折叠。
  const editing = draft !== null
  useEffect(() => {
    setCollapsed(editing)
  }, [editing, setCollapsed])

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

  /** 点击 ＋：进入新增状态，并把地址换成 /edit/new（保存后替换为 /edit/{新编号}） */
  const openCreate = useCallback(() => {
    lastHrefRef.current = window.location.pathname
    history.pushState(null, '', `${editIndexPathname(window.location.pathname)}/new`)
    setRoute({ isNew: true })
    startCreate()
  }, [startCreate])

  const startEdit = useCallback(() => {
    if (!selected) return
    setError(null)
    setPreview(false)
    setDraft({ id: selected.id, title: selected.title, content: selected.content })
  }, [selected])

  /** 选中一篇博客并同步地址到 /edit/{id}（列表点击、底部上一篇/下一篇共用） */
  const navigate = useCallback(id => {
    setSelectedId(id)
    setRoute({ id })
    const href = editHref(window.location.pathname, id)
    if (window.location.pathname !== href) history.pushState(null, '', href)
  }, [])

  // 浏览器前进/后退：按新地址关闭编辑态并重新选中
  useEffect(() => {
    const onPopState = () => {
      setDraft(null)
      const next = parseEditRoute(window.location.pathname)
      setRoute(next)
      if (next?.id != null) setSelectedId(next.id)
      if (next?.isNew) startCreate()
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [startCreate])

  // 直接打开 /edit/new 时进入新增状态（地址已就位，无需再改）
  useEffect(() => {
    if (parseEditRoute(window.location.pathname)?.isNew) startCreate()
  }, [startCreate])

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
        setRoute({ id: post.id })
        // /edit/new 保存成功后，把地址替换为新博客的唯一路径
        history.replaceState(null, '', editHref(window.location.pathname, post.id))
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
      if (selectedId === post.id) {
        setSelectedId(null)
        setRoute(null)
        history.pushState(null, '', editIndexPathname(window.location.pathname))
      }
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  /** 取消编辑：若当前地址是 /edit/new，回到进入新增前的地址（直接打开时回到目录） */
  const cancelDraft = () => {
    setDraft(null)
    if (parseEditRoute(window.location.pathname)?.isNew) {
      const fallback =
        selectedId != null
          ? editHref(window.location.pathname, selectedId)
          : editIndexPathname(window.location.pathname)
      const prevHref = lastHrefRef.current
      const target = prevHref && prevHref !== window.location.pathname ? prevHref : fallback
      history.replaceState(null, '', target)
      setRoute(parseEditRoute(target))
    }
  }

  // 深链编号不存在时给出提示；列表加载中先不判定，避免闪现
  const routeId = route?.id ?? null
  const emptyText =
    !loading && routeId !== null && !posts.some(post => post.id === routeId)
      ? `博客 #${routeId} 不存在`
      : '从左侧选择一篇博客，或点击 ＋ 新增'

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
              <button type="button" className="btn-add" title="新增博客" onClick={openCreate}>
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
              onSelect={navigate}
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
          onCancel={cancelDraft}
        />
      ) : (
        <ContentPane
          post={selected}
          posts={posts}
          onEdit={startEdit}
          onNavigate={navigate}
          emptyText={emptyText}
        />
      )}
    </div>
  )
}

/** 阅读视图：左上角编辑按钮 + 篇内搜索，右上角显示创建日期 */
function ContentPane({ post, posts, onEdit, onNavigate, emptyText }) {
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
            <span className="created-at">创建于 {formatDateTime(post.createdAt)}</span>
          </header>
          <h1 className="content-title">{post.title}</h1>
          <Markdown text={post.content} />
          <PostFooter posts={posts} postId={post.id} onNavigate={onNavigate} />
        </article>
      ) : (
        <div className="empty">{emptyText}</div>
      )}
    </main>
  )
}

/** 编辑视图：标题 + 编辑/预览切换 + 保存/取消；支持粘贴图片自动上传并插入 */
function EditorPane({ draft, preview, setPreview, onChange, onSave, onCancel }) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const textareaRef = useRef(null)

  /** 在光标处插入文本。onChange 即 setDraft，用函数式更新，避免覆盖上传期间的其他修改 */
  const insertAtCursor = text => {
    const el = textareaRef.current
    const start = el?.selectionStart
    const end = el?.selectionEnd
    onChange(prev => {
      const from = start ?? prev.content.length
      const to = end ?? prev.content.length
      return { ...prev, content: prev.content.slice(0, from) + text + prev.content.slice(to) }
    })
    // 重绘后把光标移到插入内容末尾；焦点已不在输入框时不打扰
    requestAnimationFrame(() => {
      if (!el || document.activeElement !== el) return
      const caret = (start ?? 0) + text.length
      el.setSelectionRange(caret, caret)
    })
  }

  /** 粘贴图片：上传到 /api/images 后，把图片 Markdown 插入光标处 */
  const handlePaste = async event => {
    const files = Array.from(event.clipboardData.items)
      .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
      .map(item => item.getAsFile())
      .filter(Boolean)
    if (files.length === 0) return
    event.preventDefault() // 阻止把图片当文本粘贴进来
    setUploading(true)
    setUploadError(null)
    try {
      const urls = await Promise.all(files.map(file => api.uploadImage(file)))
      insertAtCursor(urls.map(url => `![](${url})`).join('\n'))
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
    }
  }

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
          {uploading && <span className="upload-hint">正在上传图片…</span>}
        </div>
        {uploadError && <div className="editor-error">{uploadError}</div>}
        {preview ? (
          <div className="preview-box">
            <Markdown text={draft.content} />
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            className="markdown-input"
            value={draft.content}
            onChange={event => onChange({ ...draft, content: event.target.value })}
            onPaste={handlePaste}
            placeholder="用 Markdown 写点什么…（支持直接粘贴图片）"
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
