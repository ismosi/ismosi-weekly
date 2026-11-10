import { useCallback, useEffect, useRef, useState } from 'react'
import api from './api.js'

/** 输入停顿多少毫秒后自动保存 */
const AUTOSAVE_DELAY = 600

/**
 * 编辑器实时自动保存。
 *
 * 行为：
 * - draft 变化后停顿 AUTOSAVE_DELAY 毫秒自动保存；期间继续输入则重新计时。
 * - 标题为空无法保存（服务端要求非空），状态置为 empty-title，标题恢复后继续保存。
 * - 新博客（draft.id 为 null）第一笔保存走创建，成功后由 onSaved 通知外部回填编号。
 * - 保存进行中不并发第二笔请求；期间的输入在保存结束后自动排队补存。
 * - 迟到的旧保存（期间退出/切换了草稿）只刷新列表，不污染当前会话的状态。
 *
 * 返回：
 * - status / savedAt：展示用，文案见 saveStatus.js。
 * - flush()：立即保存未落盘的修改并等待完成，返回
 *   'clean'（服务端已是最新）| 'saved'（刚保存成功）| 'empty-title'（标题为空无法保存）；
 *   保存失败时抛错（供退出编辑前询问确认）。
 */
export function useAutosave({ draft, onSaved }) {
  const [status, setStatus] = useState('idle')
  const [savedAt, setSavedAt] = useState(null)

  const draftRef = useRef(null) // 最新草稿：定时器/异步回调读它，避免闭包拿到旧值
  const savedRef = useRef(null) // 最近一次成功发送的 {id,title,content}，脏检查基准
  const timerRef = useRef(null) // 防抖定时器
  const savingRef = useRef(false) // 是否有保存正在进行
  const inFlightRef = useRef(null) // 进行中的保存 Promise，flush 需要等它落地
  const onSavedRef = useRef(onSaved)
  onSavedRef.current = onSaved

  /** 服务端是否落后于当前草稿（新博客尚无落盘基准，从第一笔起都算脏） */
  function isDirty() {
    const d = draftRef.current
    const s = savedRef.current
    if (!d) return false
    if (!s) return true
    return d.title !== s.title || d.content !== s.content
  }

  /** 当前草稿是否仍是发起保存时的那份（期间没再输入、也没切换/退出草稿） */
  function isSameDraft(snapshot) {
    const current = draftRef.current
    return !!current && current.title === snapshot.title && current.content === snapshot.content
  }

  /** 按需排下一笔防抖保存；保存进行中不排，由 performSave 收尾时统一处理 */
  function schedule() {
    if (savingRef.current) return
    const d = draftRef.current
    if (!d || !isDirty()) {
      clearTimeout(timerRef.current)
      timerRef.current = null
      if (d) setStatus(savedRef.current ? 'saved' : 'idle')
      return
    }
    if (!d.title.trim()) {
      clearTimeout(timerRef.current)
      timerRef.current = null
      setStatus('empty-title')
      return
    }
    setStatus('pending')
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      runSave()
    }, AUTOSAVE_DELAY)
  }

  /** 自动保存入口：失败转成 error 状态，收尾后把保存期间的输入排下一笔 */
  async function runSave() {
    if (savingRef.current) return
    const d = draftRef.current
    if (!d) return
    if (!isDirty()) {
      setStatus(savedRef.current ? 'saved' : 'idle')
      return
    }
    if (!d.title.trim()) {
      setStatus('empty-title')
      return
    }
    try {
      await performSave()
    } catch {
      setStatus('error')
    }
    schedule()
  }

  /** 真正发起一笔保存；失败向上抛出（flush 需要感知），返回服务端保存结果 */
  async function performSave() {
    const d = draftRef.current
    const created = d.id === null
    savingRef.current = true
    setStatus('saving')
    inFlightRef.current = created
      ? api.create(d.title, d.content)
      : api.update(d.id, d.title, d.content)
    try {
      const post = await inFlightRef.current
      if (isSameDraft(d)) {
        // 基准存发送值而非服务端返回值：服务端会 trim 标题，对齐返回值会造成假脏、反复保存
        savedRef.current = { id: post.id, title: d.title, content: d.content }
        if (created && draftRef.current.id === null) {
          // 状态回填前的极小窗口内再触发保存也不至于重复创建
          draftRef.current = { ...draftRef.current, id: post.id }
        }
        setStatus('saved')
        setSavedAt(Date.now())
      }
      onSavedRef.current(post, { created, sourceDraft: d })
      return post
    } finally {
      savingRef.current = false
      inFlightRef.current = null
      schedule()
    }
  }

  /** 立即保存未落盘的修改并等待完成（退出编辑 / 手动重试前调用） */
  async function flush() {
    clearTimeout(timerRef.current)
    timerRef.current = null
    while (inFlightRef.current) {
      await inFlightRef.current.catch(() => {}) // 先等手头这笔落地，再补存剩余修改
    }
    const d = draftRef.current
    if (!d || !isDirty()) return 'clean'
    if (!d.title.trim()) return 'empty-title'
    await performSave()
    return 'saved'
  }

  // 稳定的 flush 引用，供事件监听与 useMemo/useCallback 依赖安全使用
  const flushRef = useRef(flush)
  flushRef.current = flush
  const flushStable = useCallback((...args) => flushRef.current(...args), [])

  // 同步最新草稿；退出编辑时复位基准与状态
  useEffect(() => {
    draftRef.current = draft
    if (!draft) {
      clearTimeout(timerRef.current)
      timerRef.current = null
      savedRef.current = null
      setStatus('idle')
      setSavedAt(null)
      return
    }
    // 编辑已有博客：以进入时的内容为基准，进门不发无意义的保存
    if (!savedRef.current && draft.id !== null) {
      savedRef.current = { id: draft.id, title: draft.title, content: draft.content }
    }
    schedule()
  }, [draft])

  return { status, savedAt, flush: flushStable }
}
