import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as seeds from './src/posts.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const loadPosts = () => {
  try {
    const generated = JSON.parse(
      readFileSync(path.join(__dirname, 'posts', 'post.json'), 'utf-8'),
    )
    console.log(`Loaded ${generated.length} posts from posts/post.json`)
    return generated
  } catch {
    console.log('posts/post.json not found, falling back to seeds')
    return Object.entries(seeds)
      .filter(([, post]) => post && typeof post === 'object' && post.id)
      .map(([, post]) => post)
  }
}

const posts = Object.fromEntries(
  loadPosts().map((post) => [post.id, post]),
)

export const app = new Hono()

app.get('/', (c) => c.json({ message: 'Post Panel API' }))
app.get('/api/posts', (c) => c.json(Object.values(posts)))
app.get('/api/posts/:id', (c) => {
  const post = posts[c.req.param('id')]
  return post ? c.json(post) : c.json({ error: 'Post not found' }, 404)
})

const port = Number(process.env.PORT ?? 3000)

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`)
})