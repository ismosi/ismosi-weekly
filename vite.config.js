import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 构建入口只包含展示页 index.html；编辑页 edit.html 仅本地使用，不进入产物
export default defineConfig({
  plugins: [react()],
  appType: 'mpa',
  base: './',
  build: {
    rollupOptions: {
      input: { main: path.resolve('index.html') },
    },
  },
})
