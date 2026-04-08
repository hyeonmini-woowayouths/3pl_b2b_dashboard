import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'
import { initDb } from './db'
import partners from './partners'
import zones from './zones'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true }))

// Routes
app.route('/api/partners', partners)
app.route('/api/zones', zones)

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Init DB & start
initDb()
const port = Number(process.env.PORT) || 3001

console.log(`\n🚀 API server running at http://localhost:${port}`)
console.log(`   GET  /api/partners/kanban`)
console.log(`   GET  /api/partners/:id`)
console.log(`   PATCH /api/partners/:id/stage`)
console.log(`   GET  /api/zones\n`)

serve({ fetch: app.fetch, port })
