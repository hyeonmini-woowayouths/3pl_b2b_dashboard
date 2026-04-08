import { Hono } from 'hono'
import { getDb } from './db'

const app = new Hono()

// ── GET /api/zones — 전체 권역 목록 ──
app.get('/', (c) => {
  const db = getDb()
  const search = c.req.query('search')
  const regionClass = c.req.query('region_class')
  const openOnly = c.req.query('open_only')

  let where = 'WHERE 1=1'
  const params: unknown[] = []

  if (search) {
    where += ' AND (zone_code LIKE ? OR rgn1 LIKE ? OR rgn2 LIKE ?)'
    const q = `%${search}%`
    params.push(q, q, q)
  }
  if (regionClass) {
    where += ' AND region_class = ?'
    params.push(regionClass)
  }
  if (openOnly === 'true') {
    where += ' AND is_open = 1 AND set_tracker_available = 1'
  }

  const rows = db.prepare(`SELECT * FROM zones ${where} ORDER BY zone_code`).all(...params)
  return c.json({ data: rows, total: rows.length })
})

// ── GET /api/zones/:code/recommend — 권역 기반 요금제 추천 ──
app.get('/:code/recommend', (c) => {
  const db = getDb()
  const code = c.req.param('code')

  const zone = db.prepare('SELECT * FROM zones WHERE zone_code = ?').get(code)
  if (!zone) return c.json({ error: 'Zone not found' }, 404)

  return c.json({ zone, recommended_plan: (zone as Record<string, unknown>).pricing_plan })
})

export default app
