import { Hono } from 'hono'
import { queryOne, queryAll, execute, hexId } from './db'

const app = new Hono()

// ── GET /api/zones — 전체 권역 목록 ──
app.get('/', async (c) => {
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

  const rows = await queryAll(`SELECT * FROM zones ${where} ORDER BY zone_code`, params)
  return c.json({ data: rows, total: rows.length })
})

// 지역구분 사장님 친화적 설명
const REGION_CLASS_DESC: Record<string, { label: string; color: string; desc: string }> = {
  '집중': { label: '집중', color: 'red', desc: '주문이 매우 많고 공급 확대가 필요한 지역. 세트 상향 적극 가능.' },
  '관찰': { label: '관찰', color: 'amber', desc: '주문량 보통, 안정적인 권역. 세트 유지 권장.' },
  '안정': { label: '안정', color: 'emerald', desc: '주문이 안정적이며 신규 협력사 여유 있음.' },
}

// 등급별 주간 관리비 범위 (지역구분별) — 온톨로지 기반
const WEEKLY_REVENUE: Record<string, { min: number; max: number }> = {
  '집중': { min: 230000, max: 3000000 },
  '관찰': { min: 230000, max: 2630000 },
  '안정': { min: 230000, max: 2250000 },
}

// 권역에 추가 정보 덧붙이기
async function enrichZone(row: Record<string, unknown>) {
  const zoneId = row.id as string
  const regionClass = row.region_class as string

  // 현재 운영중 협력사 수 (직계약 / 중개사 분리)
  const counts = await queryAll(`
    SELECT contract_type, COUNT(*) as c
    FROM partners
    WHERE confirmed_zone_id = ? AND pipeline_stage = 'operating' AND deleted_at IS NULL
    GROUP BY contract_type
  `, [zoneId]) as Array<{ contract_type: string; c: number }>

  const directCount = counts.find(c => c.contract_type === 'direct')?.c ?? 0
  const brokerCount = counts.find(c => c.contract_type === 'broker')?.c ?? 0

  const desc = REGION_CLASS_DESC[regionClass] ?? { label: regionClass, color: 'gray', desc: '' }
  const revenue = WEEKLY_REVENUE[regionClass] ?? { min: 230000, max: 2250000 }

  const setTrackerAvailable = Boolean(row.set_tracker_available)

  return {
    id: row.id,
    zone_code: row.zone_code,
    rgn1: row.rgn1,
    rgn2: row.rgn2,
    region_class: regionClass,
    region_class_label: desc.label,
    region_class_color: desc.color,
    region_class_desc: desc.desc,
    pricing_plan: row.pricing_plan,
    weekly_volume: 750,
    estimated_weekly_revenue: revenue,
    set_tracker_available: setTrackerAvailable,
    set_cap_warning: !setTrackerAvailable,
    active_partners: directCount + brokerCount,
    direct_partners: directCount,
    broker_partners: brokerCount,
    // 직계약은 권역당 1개만 — 이미 있으면 경고
    direct_slot_full: directCount >= 1,
  }
}

// ── GET /api/zones/suggest — 희망지역 텍스트 → 권역 자동 추천 (enriched) ──
app.get('/suggest', async (c) => {
  const q = (c.req.query('q') ?? '').trim()
  if (!q) return c.json({ suggestions: [] })

  const tokens = q.split(/\s+/).map(t => t.replace(/(시|구|군|읍|면|동)$/, '')).filter(Boolean)
  if (tokens.length === 0) return c.json({ suggestions: [] })

  const sql = `SELECT *, (
    ${tokens.map(() => '(CASE WHEN rgn1 LIKE ? THEN 2 WHEN rgn2 LIKE ? THEN 3 WHEN zone_code LIKE ? THEN 1 ELSE 0 END)').join(' + ')}
  ) as score FROM zones WHERE is_open = 1 AND (
    ${tokens.map(() => '(rgn1 LIKE ? OR rgn2 LIKE ? OR zone_code LIKE ?)').join(' AND ')}
  )
  ORDER BY set_tracker_available DESC, score DESC, zone_code LIMIT 20`

  const params: unknown[] = []
  for (const t of tokens) params.push(`%${t}%`, `%${t}%`, `%${t}%`)
  for (const t of tokens) params.push(`%${t}%`, `%${t}%`, `%${t}%`)

  const rows = await queryAll(sql, params) as Array<Record<string, unknown>>

  return c.json({ suggestions: await Promise.all(rows.map(r => enrichZone(r))) })
})

// ── GET /api/zones/by-region — rgn1(시도) 또는 rgn2(시군구) 기준 권역 리스트 ──
app.get('/by-region', async (c) => {
  const rgn1 = c.req.query('rgn1')
  const rgn2 = c.req.query('rgn2')

  if (!rgn1 && !rgn2) {
    // 시도 목록만 반환
    const regions = await queryAll(`
      SELECT rgn1, COUNT(*) as zone_count FROM zones
      WHERE is_open = 1 GROUP BY rgn1 ORDER BY
        CASE rgn1
          WHEN '서울특별시' THEN 1
          WHEN '경기도' THEN 2
          WHEN '인천광역시' THEN 3
          WHEN '부산광역시' THEN 4
          WHEN '대구광역시' THEN 5
          WHEN '광주광역시' THEN 6
          WHEN '대전광역시' THEN 7
          WHEN '울산광역시' THEN 8
          WHEN '세종특별자치시' THEN 9
          ELSE 99
        END, rgn1
    `, [])
    return c.json({ regions })
  }

  // 선택된 rgn1의 rgn2 목록 (시군구별로 그룹핑된 권역들)
  let sql = 'SELECT * FROM zones WHERE is_open = 1'
  const params: unknown[] = []
  if (rgn1) { sql += ' AND rgn1 = ?'; params.push(rgn1) }
  if (rgn2) { sql += ' AND rgn2 = ?'; params.push(rgn2) }
  sql += ' ORDER BY rgn2, zone_code'

  const rows = await queryAll(sql, params) as Array<Record<string, unknown>>

  // rgn2별 그룹핑
  const grouped = new Map<string, Array<Awaited<ReturnType<typeof enrichZone>>>>()
  for (const r of rows) {
    const key = r.rgn2 as string
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(await enrichZone(r))
  }

  return c.json({
    rgn1,
    groups: Array.from(grouped.entries()).map(([rgn2, zones]) => ({ rgn2, zones })),
  })
})

// ── GET /api/zones/:code/recommend — 권역 기반 요금제 추천 ──
app.get('/:code/recommend', async (c) => {
  const code = c.req.param('code')

  const zone = await queryOne('SELECT * FROM zones WHERE zone_code = ?', [code])
  if (!zone) return c.json({ error: 'Zone not found' }, 404)

  return c.json({ zone, recommended_plan: (zone as Record<string, unknown>).pricing_plan })
})

export default app
