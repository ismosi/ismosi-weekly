import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 构建入口只包含展示页 index.html；编辑页 edit.html 仅本地使用，不进入产物
export default defineConfig({
  plugins: [
    react(),
    // `npm run dev` 直跑 Vite 时，把 /edit/{id} 回退到 edit.html（`npm run edit` 已在服务层处理）
    {
      name: 'edit-page-fallback',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const { pathname } = new URL(req.url, 'http://localhost')
          if (pathname === '/edit' || /^\/edit\/(?:new|\d+)\/?$/.test(pathname)) {
            req.url = '/edit.html'
          }
          next()
        })
      },
    },
  ],
  appType: 'mpa',
  base: './',
  build: {
    rollupOptions: {
      input: { main: path.resolve('index.html') },
    },
  },
})
