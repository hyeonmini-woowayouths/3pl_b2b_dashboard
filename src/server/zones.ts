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

// ── GET /api/zones/suggest — P0-2: 희망지역 텍스트 → 권역 자동 추천 ──
app.get('/suggest', (c) => {
  const db = getDb()
  const q = (c.req.query('q') ?? '').trim()
  if (!q) return c.json({ suggestions: [] })

  // 키워드 추출: 공백으로 분리, 빈 토큰 제거, 조사 제거
  const tokens = q.split(/\s+/).map(t => t.replace(/(시|구|군|읍|면|동)$/, '')).filter(Boolean)
  if (tokens.length === 0) return c.json({ suggestions: [] })

  // 각 토큰을 LIKE로 검색 — rgn1/rgn2/zone_code 중 매칭되는 zone들의 교집합
  let sql = `SELECT *, (
    ${tokens.map(() => '(CASE WHEN rgn1 LIKE ? THEN 2 WHEN rgn2 LIKE ? THEN 3 WHEN zone_code LIKE ? THEN 1 ELSE 0 END)').join(' + ')}
  ) as score FROM zones WHERE is_open = 1 AND (
    ${tokens.map(() => '(rgn1 LIKE ? OR rgn2 LIKE ? OR zone_code LIKE ?)').join(' AND ')}
  )
  ORDER BY set_tracker_available DESC, score DESC, zone_code LIMIT 10`

  const params: unknown[] = []
  // score 계산용 파라미터
  for (const t of tokens) {
    params.push(`%${t}%`, `%${t}%`, `%${t}%`)
  }
  // WHERE 절 파라미터
  for (const t of tokens) {
    params.push(`%${t}%`, `%${t}%`, `%${t}%`)
  }

  const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>

  return c.json({
    suggestions: rows.map(r => ({
      id: r.id,
      zone_code: r.zone_code,
      rgn1: r.rgn1,
      rgn2: r.rgn2,
      region_class: r.region_class,
      pricing_plan: r.pricing_plan,
      set_tracker_available: r.set_tracker_available,
      set_cap_warning: !r.set_tracker_available, // 3PL 확대 불가 권역 경고
    })),
  })
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
