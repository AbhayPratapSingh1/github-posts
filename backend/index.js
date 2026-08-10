import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import {
  alienAttack,
  loxJava,
  fallBall,
  highwayCar,
  rubixCube,
  bomberMan,
  threeDShapes,
  lSystemTerminal,
  threeDShapesTerminal,
  flappyBird,
  mediaPipeDrawWithHand,
  dinoGesture,
  zombieHit3D,
  threeDMaze,
  mineSwapper,
  idCardGenerator,
} from './src/posts.js'

const posts = {
  [alienAttack.id]: alienAttack,
  [loxJava.id]: loxJava,
  [fallBall.id]: fallBall,
  [highwayCar.id]: highwayCar,
  [rubixCube.id]: rubixCube,
  [bomberMan.id]: bomberMan,
  [threeDShapes.id]: threeDShapes,
  [lSystemTerminal.id]: lSystemTerminal,
  [threeDShapesTerminal.id]: threeDShapesTerminal,
  [flappyBird.id]: flappyBird,
  [mediaPipeDrawWithHand.id]: mediaPipeDrawWithHand,
  [dinoGesture.id]: dinoGesture,
  [zombieHit3D.id]: zombieHit3D,
  [threeDMaze.id]: threeDMaze,
  [mineSwapper.id]: mineSwapper,
  [idCardGenerator.id]: idCardGenerator,
}

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