import { useEffect, useState } from 'react'
import { fetchCount, hitCount, postCounterKey } from './abacus.js'
import { ChevronLeftIcon, ChevronRightIcon, GithubIcon } from './icons.jsx'

const GITHUB_URL = 'https://github.com/ismosi'

/**
 * 链接组：上一篇 / 下一篇 / GitHub。
 * 列表约定最新在前，因此「上一篇」是更新的一篇、「下一篇」是更旧的一篇。
 */
function PostNav({ posts, postId, onNavigate }) {
  const index = posts.findIndex(post => post.id === postId)
  if (index === -1) return null
  const prev = posts[index - 1] ?? null
  const next = posts[index + 1] ?? null
  return (
    <nav className="post-nav" aria-label="博客导航">
      <button
        type="button"
        className="post-nav-btn"
        disabled={!prev}
        title={prev ? `上一篇：${prev.title}` : '已经是最新一篇'}
        onClick={() => prev && onNavigate(prev.id)}
      >
        <ChevronLeftIcon />
        <span className="post-nav-text">{prev ? prev.title : '没有上一篇'}</span>
      </button>
      <a
        className="post-nav-btn post-nav-github"
        href={GITHUB_URL}
        target="_blank"
        rel="noreferrer"
      >
        <GithubIcon />
        <span className="post-nav-text">GitHub</span>
      </a>
      <button
        type="button"
        className="post-nav-btn"
        disabled={!next}
        title={next ? `下一篇：${next.title}` : '已经是最后一篇'}
        onClick={() => next && onNavigate(next.id)}
      >
        <span className="post-nav-text">{next ? next.title : '没有下一篇'}</span>
        <ChevronRightIcon />
      </button>
    </nav>
  )
}

/** 单个计数按钮：彩色表情图标 + 全局计数（进入文章读取，点击自增，乐观更新失败回滚） */
function CounterButton({ postId, kind, emoji, ariaLabel }) {
  const [count, setCount] = useState(null) // null 表示加载中或失败，显示占位符 –

  useEffect(() => {
    let cancelled = false
    setCount(null)
    fetchCount(postCounterKey(postId, kind))
      .then(value => {
        if (!cancelled) setCount(value)
      })
      .catch(() => {}) // 读取失败保持占位符，不阻塞阅读
    return () => {
      cancelled = true
    }
  }, [postId, kind])

  const hit = async () => {
    setCount(value => (value ?? 0) + 1) // 先乐观 +1，请求成功后以服务端为准
    try {
      setCount(await hitCount(postCounterKey(postId, kind)))
    } catch {
      setCount(value => Math.max(0, (value ?? 1) - 1)) // 失败回滚
    }
  }

  return (
    <button type="button" className="engage-btn" aria-label={ariaLabel} onClick={hit}>
      <span className="engage-emoji" role="img" aria-hidden="true">
        {emoji}
      </span>
      <span className="engage-count">{count ?? '–'}</span>
    </button>
  )
}

/** 欢迎交流：标题在图标正上方，加油 / 点赞 / 看看，计数为所有访客共享的全局累计值 */
function EngagementBar({ postId }) {
  return (
    <div className="engage-bar">
      <span className="engage-heading">欢迎交流</span>
      <div className="engage-actions">
        <CounterButton postId={postId} kind="cheer" emoji="💪" ariaLabel="加油" />
        <CounterButton postId={postId} kind="like" emoji="👍" ariaLabel="点赞" />
        <CounterButton postId={postId} kind="eye" emoji="👀" ariaLabel="看看" />
      </div>
    </div>
  )
}

/** 文章底部：链接组 + 欢迎交流（展示页与编辑页阅读视图共用） */
export default function PostFooter({ posts, postId, onNavigate }) {
  return (
    <footer className="post-footer">
      <PostNav posts={posts} postId={postId} onNavigate={onNavigate} />
      <EngagementBar postId={postId} />
    </footer>
  )
}
