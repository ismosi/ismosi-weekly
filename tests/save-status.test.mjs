import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatSavedAt, saveStatusText } from '../src/editor/saveStatus.js'

const TS = new Date(2024, 0, 1, 9, 5, 3).getTime() // 09:05:03

test('formatSavedAt 把时间戳格式化为 HH:MM:SS', () => {
  assert.equal(formatSavedAt(TS), '09:05:03')
  assert.equal(formatSavedAt(new Date(2024, 0, 1, 23, 59, 9).getTime()), '23:59:09')
})

test('saveStatusText 覆盖全部状态取值', () => {
  assert.equal(saveStatusText('pending'), '待保存…')
  assert.equal(saveStatusText('saving'), '保存中…')
  assert.equal(saveStatusText('saved', TS), '已保存 09:05:03')
  assert.equal(saveStatusText('idle', TS), '已保存 09:05:03')
  assert.equal(saveStatusText('error'), '保存失败，点击重试')
  assert.equal(saveStatusText('empty-title'), '标题为空，暂未保存')
})

test('saveStatusText：idle 且从未保存过不显示占位文案', () => {
  assert.equal(saveStatusText('idle', null), '')
  assert.equal(saveStatusText('idle'), '')
  assert.equal(saveStatusText('saved', null), '')
})

test('saveStatusText：未知状态返回空串', () => {
  assert.equal(saveStatusText('unknown', TS), '')
})
