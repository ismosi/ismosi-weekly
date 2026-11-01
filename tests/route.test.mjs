import test from 'node:test'
import assert from 'node:assert/strict'
import { editHref, editIndexPathname, parseEditRoute, siteBase } from '../src/shared/route.js'

test('parseEditRoute 解析 /edit/{id} 与 /edit/new', () => {
  assert.deepEqual(parseEditRoute('/edit/1'), { id: 1 })
  assert.deepEqual(parseEditRoute('/edit/42/'), { id: 42 })
  assert.deepEqual(parseEditRoute('/repo/edit/7'), { id: 7 })
  assert.deepEqual(parseEditRoute('/edit/new'), { isNew: true })
})

test('parseEditRoute 对非博客路由返回 null', () => {
  assert.equal(parseEditRoute('/'), null)
  assert.equal(parseEditRoute('/edit'), null)
  assert.equal(parseEditRoute('/edit/'), null)
  assert.equal(parseEditRoute('/edit/abc'), null)
  assert.equal(parseEditRoute('/edit/1/2'), null)
  assert.equal(parseEditRoute('/editing/1'), null)
})

test('siteBase 推导站点根（兼容 Pages 子路径部署）', () => {
  assert.equal(siteBase('/'), '/')
  assert.equal(siteBase('/edit'), '/')
  assert.equal(siteBase('/edit/1'), '/')
  assert.equal(siteBase('/repo/'), '/repo/')
  assert.equal(siteBase('/repo/edit/1'), '/repo/')
})

test('editHref 与 editIndexPathname 按站点根拼接路径', () => {
  assert.equal(editHref('/', 3), '/edit/3')
  assert.equal(editHref('/edit', 3), '/edit/3')
  assert.equal(editHref('/repo/', 12), '/repo/edit/12')
  assert.equal(editHref('/repo/edit/1', 12), '/repo/edit/12')
  assert.equal(editIndexPathname('/'), '/edit')
  assert.equal(editIndexPathname('/repo/edit/1'), '/repo/edit')
})
