import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { writePostsJson } from '../src/shared/posts.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_FILE = path.join(ROOT, 'src/generated/posts.json')

const posts = await writePostsJson(path.join(ROOT, 'content'), OUT_FILE)
console.log(`已生成博客清单（${posts.length} 篇）→ ${path.relative(ROOT, OUT_FILE)}`)
