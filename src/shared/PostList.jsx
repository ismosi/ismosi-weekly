import { formatDate } from './date.js'
import { TrashIcon } from './icons.jsx'

/**
 * 博客列表（展示页与编辑页共用）。
 * 传入 onDelete 时，卡片最右侧显示删除图标（仅编辑页使用）。
 */
export default function PostList({ posts, selectedId, onSelect, onDelete = null }) {
  if (posts.length === 0) {
    return <div className="empty">暂无博客</div>
  }
  return (
    <ul className="post-list">
      {posts.map(post => (
        <li
          key={post.id}
          className={`post-card${post.id === selectedId ? ' active' : ''}`}
          onClick={() => onSelect(post.id)}
        >
          <div className="post-card-main">
            <div className="post-card-title">
              <span className="post-id">#{post.id}</span>
              <span className="post-card-name">{post.title}</span>
            </div>
            <div className="post-card-date">{formatDate(post.createdAt)}</div>
          </div>
          {onDelete && (
            <button
              type="button"
              className="icon-btn icon-btn-danger"
              title="删除博客"
              onClick={event => {
                event.stopPropagation()
                onDelete(post)
              }}
            >
              <TrashIcon />
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
