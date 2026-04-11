import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'
import { initDb } from './db'
import partners from './partners'
import zones from './zones'
import integrations from './integrations'
import { integrationConfig } from './integrations/config'
import { authMiddleware } from './auth'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true }))
app.use('/api/*', authMiddleware)

// Routes
app.route('/api/partners', partners)
app.route('/api/zones', zones)
app.route('/api/integrations', integrations)

// Health check
app.get('/api/health', (c) => c.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  externalApiLive: integrationConfig.isLive,
}))

// Init DB & start
initDb()
const port = Number(process.env.PORT) || 3001

console.log(`\n🚀 API server running at http://localhost:${port}`)
console.log(`   외부 연동: ${integrationConfig.isLive ? '🟢 LIVE' : '🟡 DRY-RUN (로깅만)'}`)
console.log(`   GET  /api/partners/kanban`)
console.log(`   POST /api/integrations/proposal`)
console.log(`   POST /api/integrations/contract-send`)
console.log(`   POST /api/integrations/doc-remind`)
console.log(`   POST /api/integrations/drive-folder`)
console.log(`   POST /api/integrations/slack-notify\n`)

serve({ fetch: app.fetch, port })
