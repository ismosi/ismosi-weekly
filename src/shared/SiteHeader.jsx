import logoUrl from '../assets/logo.png'
import { ChevronLeftIcon } from './icons.jsx'

/** 侧栏顶部：Logo + 站点标题（展示页与编辑页共用）；onCollapse 用于折叠列表 */
export default function SiteHeader({ onCollapse = null }) {
  return (
    <div className="site-header">
      <div className="site-brand">
        <img className="site-logo" src={logoUrl} alt="站点 Logo" />
        <span className="site-title">Ismosi Weekly</span>
      </div>
      {onCollapse && (
        <button type="button" className="icon-btn" title="折叠博客列表" onClick={onCollapse}>
          <ChevronLeftIcon />
        </button>
      )}
    </div>
  )
}
