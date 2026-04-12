import { Hono } from 'hono'
import { getDb } from './db'

const app = new Hono()

// ── GET /api/partners — 칸반 보드용 전체 목록 ──
app.get('/', (c) => {
  const db = getDb()
  const stage = c.req.query('stage')
  const search = c.req.query('search')
  const contractType = c.req.query('contract_type')
  const limit = Number(c.req.query('limit')) || 200
  const offset = Number(c.req.query('offset')) || 0

  const includeTerminated = c.req.query('include_terminated') === 'true'
  let where = `WHERE p.deleted_at IS NULL${includeTerminated ? '' : " AND p.pipeline_stage != 'terminated'"}`
  const params: unknown[] = []

  if (stage) {
    where += ' AND p.pipeline_stage = ?'
    params.push(stage)
  }
  if (search) {
    where += ' AND (p.company_name LIKE ? OR p.business_number LIKE ? OR p.applicant_name LIKE ? OR p.dp_code LIKE ?)'
    const q = `%${search}%`
    params.push(q, q, q, q)
  }
  if (contractType) {
    where += ' AND p.contract_type = ?'
    params.push(contractType)
  }

  const rows = db.prepare(`
    SELECT
      p.id, p.contract_type, p.pipeline_stage, p.status,
      p.apply_date, p.company_name, p.applicant_name, p.representative_name,
      p.email, p.phone, p.representative_phone,
      p.business_type, p.business_number,
      p.business_open_date, p.business_category, p.business_item, p.business_address,
      p.desired_region_text, p.confirmed_zone_id,
      z.zone_code AS confirmed_zone_code,
      p.pricing_plan, p.contract_template,
      p.experience_years, p.rider_count, p.platform_experience,
      p.dp_code, p.biz_id, p.sap_code, p.operating_start_date,
      p.assigned_team,
      u.name AS assigned_user_name,
      p.created_at, p.updated_at
    FROM partners p
    LEFT JOIN zones z ON z.id = p.confirmed_zone_id
    LEFT JOIN users u ON u.id = p.assigned_user_id
    ${where}
    ORDER BY p.apply_date DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset)

  const total = (db.prepare(`SELECT COUNT(*) as c FROM partners p ${where}`).get(...params) as { c: number }).c

  return c.json({ data: rows, total, limit, offset })
})

// ── GET /api/partners/kanban — 칸반 단계별 카운트 + 최근 카드 ──
app.get('/kanban', (c) => {
  const db = getDb()
  const search = c.req.query('search')
  const dateFrom = c.req.query('date_from')
  const dateTo = c.req.query('date_to')
  const contractType = c.req.query('contract_type')
  const statuses = c.req.query('statuses') // comma-separated
  const perColumn = Number(c.req.query('per_column')) || 50

  let searchWhere = ''
  const searchParams: unknown[] = []
  if (search) {
    searchWhere += ' AND (p.company_name LIKE ? OR p.business_number LIKE ? OR p.applicant_name LIKE ?)'
    const q = `%${search}%`
    searchParams.push(q, q, q)
  }
  // 날짜 필터는 단계별로 의미 있는 날짜 컬럼 적용
  // inbound: apply_date, doc_review: updated_at, contracting: updated_at, operating: operating_start_date
  const dateFilterSql = dateFrom || dateTo ? true : false
  if (contractType && contractType !== 'all') {
    searchWhere += ' AND p.contract_type = ?'
    searchParams.push(contractType)
  }
  if (statuses) {
    const statusList = statuses.split(',').filter(Boolean)
    if (statusList.length > 0) {
      searchWhere += ` AND p.status IN (${statusList.map(() => '?').join(',')})`
      searchParams.push(...statusList)
    }
  }

  // 단계별 날짜 필터 컬럼: 각 단계에서 의미 있는 시점 기준
  const stageDateColumn: Record<string, string> = {
    inbound: 'p.apply_date',           // 신청일
    doc_review: 'p.updated_at',        // 서류 검토 진입/갱신일
    contracting: 'p.updated_at',       // 계약 진행 진입/갱신일
    operating: "COALESCE(p.operating_start_date, p.updated_at)",  // 운영 시작일
  }

  const stages = ['inbound', 'doc_review', 'contracting', 'operating']
  const result: Record<string, { count: number; partners: unknown[] }> = {}

  for (const stage of stages) {
    let dateWhere = ''
    const dateParams: unknown[] = []
    if (dateFilterSql) {
      const col = stageDateColumn[stage] ?? 'p.apply_date'
      if (dateFrom) { dateWhere += ` AND ${col} >= ?`; dateParams.push(dateFrom) }
      if (dateTo) { dateWhere += ` AND ${col} <= ?`; dateParams.push(dateTo) }
    }

    const allParams = [...searchParams, ...dateParams]

    const count = (db.prepare(`
      SELECT COUNT(*) as c FROM partners p
      WHERE p.deleted_at IS NULL AND p.pipeline_stage = ? ${searchWhere} ${dateWhere}
    `).get(stage, ...allParams) as { c: number }).c

    const partners = db.prepare(`
      SELECT
        p.id, p.contract_type, p.pipeline_stage, p.status,
        p.apply_date, p.company_name, p.applicant_name,
        p.business_type, p.business_number,
        p.desired_region_text, p.confirmed_zone_id,
        z.zone_code AS confirmed_zone_code,
        p.pricing_plan, p.dp_code,
        p.operating_start_date,
        p.assigned_team,
        u.name AS assigned_user_name,
        p.created_at, p.updated_at
      FROM partners p
      LEFT JOIN zones z ON z.id = p.confirmed_zone_id
      LEFT JOIN users u ON u.id = p.assigned_user_id
      WHERE p.deleted_at IS NULL AND p.pipeline_stage = ? ${searchWhere} ${dateWhere}
      ORDER BY p.updated_at DESC
      LIMIT ?
    `).all(stage, ...allParams, perColumn)

    result[stage] = { count, partners }
  }

  return c.json(result)
})

// ── GET /api/partners/:id — 상세 조회 ──
app.get('/:id', (c) => {
  const db = getDb()
  const id = c.req.param('id')

  const partner = db.prepare(`
    SELECT p.*,
      z.zone_code AS confirmed_zone_code,
      z.rgn1, z.rgn2, z.region_class,
      u.name AS assigned_user_name
    FROM partners p
    LEFT JOIN zones z ON z.id = p.confirmed_zone_id
    LEFT JOIN users u ON u.id = p.assigned_user_id
    WHERE p.id = ?
  `).get(id)

  if (!partner) return c.json({ error: 'Not found' }, 404)

  const documents = db.prepare(`
    SELECT * FROM partner_documents WHERE partner_id = ? ORDER BY doc_type
  `).all(id)

  const contracts = db.prepare(`
    SELECT * FROM contracts WHERE partner_id = ? ORDER BY created_at DESC
  `).all(id)

  const bankAccounts = db.prepare(`
    SELECT * FROM bank_accounts WHERE partner_id = ? ORDER BY is_current DESC, created_at DESC
  `).all(id)

  const insurance = db.prepare(`
    SELECT * FROM insurance_records WHERE partner_id = ? ORDER BY created_at DESC
  `).all(id)

  const notes = db.prepare(`
    SELECT n.*, u.name AS author_name
    FROM partner_notes n
    LEFT JOIN users u ON u.id = n.created_by
    WHERE n.partner_id = ?
    ORDER BY n.created_at DESC
    LIMIT 20
  `).all(id)

  const statusHistory = db.prepare(`
    SELECT sl.*, u.name AS changed_by_name
    FROM partner_status_logs sl
    LEFT JOIN users u ON u.id = sl.changed_by
    WHERE sl.partner_id = ?
    ORDER BY sl.created_at DESC
    LIMIT 30
  `).all(id)

  return c.json({ partner, documents, contracts, bankAccounts, insurance, notes, statusHistory })
})

// ── PATCH /api/partners/:id/stage — 파이프라인 단계 변경 (요건 검증 포함) ──
app.patch('/:id/stage', async (c) => {
  const db = getDb()
  const id = c.req.param('id')
  const body = await c.req.json<{ pipeline_stage: string; status?: string; reason?: string; force?: boolean }>()

  const partner = db.prepare('SELECT * FROM partners WHERE id = ?').get(id) as Record<string, string | null> | undefined
  if (!partner) return c.json({ error: 'Not found' }, 404)

  const currentStage = partner.pipeline_stage
  const targetStage = body.pipeline_stage

  // ── 요건 검증 (force=true가 아닌 한) ──
  if (!body.force) {
    const errors: string[] = []

    // inbound → doc_review: 제안서 발송 완료 필요
    if (currentStage === 'inbound' && targetStage === 'doc_review') {
      if (!partner.proposal_sent || partner.proposal_sent === 'N') {
        errors.push('제안서가 아직 발송되지 않았습니다')
      }
      if (partner.business_type === '간이과세') {
        errors.push('간이과세자는 진행할 수 없습니다')
      }
    }

    // doc_review → contracting: 필수 서류 3종 승인 + 권역 확정
    if (currentStage === 'doc_review' && targetStage === 'contracting') {
      const approvedDocs = db.prepare(
        "SELECT COUNT(*) as c FROM partner_documents WHERE partner_id = ? AND status = 'approved' AND doc_type IN ('business_cert','bank_statement','id_card')"
      ).get(id) as { c: number }
      if (approvedDocs.c < 3) {
        errors.push(`필수 서류 ${approvedDocs.c}/3종 승인 — 사업자등록증, 통장 사본, 신분증 모두 승인 필요`)
      }
      if (!partner.confirmed_zone_id) {
        errors.push('확정 권역이 지정되지 않았습니다 (Set Tracker 매핑 필요)')
      }
    }

    // contracting → operating: 계약 체결 완료 필요
    if (currentStage === 'contracting' && targetStage === 'operating') {
      const signedContract = db.prepare(
        "SELECT COUNT(*) as c FROM contracts WHERE partner_id = ? AND signok_status IN ('체결','signed')"
      ).get(id) as { c: number }
      if (signedContract.c === 0) {
        errors.push('계약 체결이 완료되지 않았습니다')
      }
      if (!partner.dp_code) {
        errors.push('BRMS 협력사 코드(DP)가 생성되지 않았습니다')
      }
    }

    // 역방향 이동 차단 (terminated 제외)
    const stageOrder = ['inbound', 'doc_review', 'contracting', 'operating']
    const currentIdx = stageOrder.indexOf(currentStage ?? '')
    const targetIdx = stageOrder.indexOf(targetStage)
    if (currentIdx >= 0 && targetIdx >= 0 && targetIdx < currentIdx) {
      errors.push(`${currentStage} → ${targetStage}: 이전 단계로는 이동할 수 없습니다`)
    }

    // 단계 건너뛰기 차단
    if (currentIdx >= 0 && targetIdx >= 0 && targetIdx > currentIdx + 1) {
      errors.push(`단계를 건너뛸 수 없습니다 (${currentStage} → ${targetStage})`)
    }

    if (errors.length > 0) {
      return c.json({ ok: false, errors }, 422)
    }
  }

  const stageDefaults: Record<string, string> = {
    inbound: 'submitted',
    doc_review: 'docs_pending',
    contracting: 'contract_sending',
    operating: 'preparing',
    terminated: 'contract_ended',
  }

  const newStatus = body.status || stageDefaults[body.pipeline_stage] || partner.status
  const now = new Date().toISOString()

  db.prepare(`
    UPDATE partners SET pipeline_stage = ?, status = ?, updated_at = ? WHERE id = ?
  `).run(body.pipeline_stage, newStatus, now, id)

  db.prepare(`
    INSERT INTO partner_status_logs (id, partner_id, from_stage, from_status, to_stage, to_status, reason, created_at)
    VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?)
  `).run(id, currentStage, partner.status, body.pipeline_stage, newStatus, body.reason || null, now)

  return c.json({ ok: true, pipeline_stage: body.pipeline_stage, status: newStatus })
})

// ── PATCH /api/partners/:id — 필드 업데이트 ──
app.patch('/:id', async (c) => {
  const db = getDb()
  const id = c.req.param('id')
  const body = await c.req.json<Record<string, unknown>>()

  const allowedFields = [
    'company_name', 'applicant_name', 'representative_name', 'email', 'phone',
    'representative_phone', 'business_type', 'business_number',
    'business_open_date', 'business_category', 'business_item', 'business_address',
    'desired_region_text', 'confirmed_zone_id', 'pricing_plan', 'contract_template',
    'dp_code', 'biz_id', 'sap_code', 'operating_start_date',
    'status', 'pipeline_stage',
    'assigned_team', 'assigned_user_id',
    'drop_reason', 'doc_review_result', 'proposal_sent',
  ]

  const sets: string[] = []
  const vals: unknown[] = []
  for (const [k, v] of Object.entries(body)) {
    if (allowedFields.includes(k)) {
      sets.push(`${k} = ?`)
      vals.push(v)
    }
  }

  if (sets.length === 0) return c.json({ error: 'No valid fields' }, 400)

  sets.push('updated_at = ?')
  vals.push(new Date().toISOString())
  vals.push(id)

  db.prepare(`UPDATE partners SET ${sets.join(', ')} WHERE id = ?`).run(...vals)

  return c.json({ ok: true })
})

// ── POST /api/partners/apply — F-16: 외부 셀프서비스 접수 ──
app.post('/apply', async (c) => {
  const db = getDb()
  const body = await c.req.json<{
    company_name: string
    applicant_name: string
    email: string
    phone: string
    business_type: string
    business_number: string
    desired_region_text: string
    experience_years?: string
    rider_count?: string
    platform_experience?: string
    comment?: string
    terms_agreed: boolean
  }>()

  if (!body.terms_agreed) return c.json({ error: '약관 동의가 필요합니다' }, 400)
  if (!body.company_name || !body.business_number || !body.email) {
    return c.json({ error: '필수 항목을 입력하세요' }, 400)
  }

  // 간이과세자 차단
  if (body.business_type === '간이과세') {
    return c.json({ error: '간이과세자는 신청할 수 없습니다. 일반과세 사업자 또는 법인사업자만 가능합니다.' }, 400)
  }

  // 중복 사업자번호 체크
  const existing = db.prepare(
    "SELECT id, pipeline_stage, status FROM partners WHERE business_number = ? AND deleted_at IS NULL AND pipeline_stage != 'terminated'"
  ).get(body.business_number) as { id: string; pipeline_stage: string; status: string } | undefined

  if (existing) {
    return c.json({ error: `이미 등록된 사업자입니다 (현재 상태: ${existing.pipeline_stage}/${existing.status})` }, 409)
  }

  const now = new Date().toISOString()
  const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  db.prepare(`
    INSERT INTO partners (
      id, contract_type, pipeline_stage, status,
      apply_date, company_name, applicant_name, email, phone,
      business_type, business_number, desired_region_text,
      experience_years, rider_count, platform_experience, comment,
      created_at, updated_at
    ) VALUES (?, 'direct', 'inbound', 'submitted', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, now.slice(0, 10), body.company_name, body.applicant_name, body.email, body.phone,
    body.business_type, body.business_number, body.desired_region_text,
    body.experience_years ?? null, body.rider_count ?? null,
    body.platform_experience ?? null, body.comment ?? null,
    now, now,
  )

  return c.json({ ok: true, id, message: '신청이 접수되었습니다. 검토 후 안내드리겠습니다.' })
})

// ── POST /api/partners/:id/documents — 서류 생성/업데이트 ──
app.post('/:id/documents', async (c) => {
  const db = getDb()
  const partnerId = c.req.param('id')
  const body = await c.req.json<{ doc_type: string; status: string; rejection_reason?: string }>()
  const now = new Date().toISOString()

  const existing = db.prepare(
    'SELECT id FROM partner_documents WHERE partner_id = ? AND doc_type = ?'
  ).get(partnerId, body.doc_type) as { id: string } | undefined

  if (existing) {
    db.prepare(`
      UPDATE partner_documents SET status = ?, rejection_reason = ?, reviewed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(body.status, body.rejection_reason || null, now, now, existing.id)
  } else {
    db.prepare(`
      INSERT INTO partner_documents (id, partner_id, doc_type, status, rejection_reason, reviewed_at, created_at, updated_at)
      VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?)
    `).run(partnerId, body.doc_type, body.status, body.rejection_reason || null, now, now, now)
  }

  return c.json({ ok: true })
})

// ── POST /api/partners/:id/notes — 메모 추가 ──
app.post('/:id/notes', async (c) => {
  const db = getDb()
  const partnerId = c.req.param('id')
  const body = await c.req.json<{ note_type?: string; content: string }>()

  db.prepare(`
    INSERT INTO partner_notes (id, partner_id, note_type, content, created_at)
    VALUES (lower(hex(randomblob(16))), ?, ?, ?, datetime('now'))
  `).run(partnerId, body.note_type || 'general', body.content)

  return c.json({ ok: true })
})

// ── PATCH /api/partners/:id/stage — 파이프라인 단계 변경 (사유 포함) ──
// (기존 stage 변경 API에 reason 필드 추가는 이미 partner_status_logs에 컬럼 있음)

// ── GET /api/partners/export/brms-business — BRMS 사업자 등록 CSV ──
app.get('/export/brms-business', (c) => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT p.company_name, p.business_number, p.representative_name,
      p.business_open_date, p.business_category, p.business_item,
      p.business_address, p.business_type, p.representative_birth,
      p.representative_phone, p.email,
      b.bank_name, b.account_number, b.account_holder
    FROM partners p
    LEFT JOIN bank_accounts b ON b.partner_id = p.id AND b.is_current = 1
    WHERE p.pipeline_stage = 'contracting' AND p.status IN ('contract_signed', 'brms_registering')
      AND p.deleted_at IS NULL
    ORDER BY p.updated_at DESC
  `).all() as Record<string, string | null>[]

  const header = '계좌 정보,법인명,사업자등록번호,대표자명,개업연월일,업태,업종,사업장 주소,사업자 등록 형태,대표자 생년월일,연락처,이메일,은행명,계좌번호,예금주'
  const csvRows = rows.map(r => {
    const accountInfo = [r.bank_name, r.account_number, r.account_holder].filter(Boolean).join('/')
    return [accountInfo, r.company_name, r.business_number, r.representative_name,
      r.business_open_date, r.business_category, r.business_item,
      r.business_address, r.business_type, r.representative_birth,
      r.representative_phone, r.email, r.bank_name, r.account_number, r.account_holder
    ].map(v => `"${(v ?? '').replace(/"/g, '""')}"`).join(',')
  })

  const csv = '\uFEFF' + header + '\n' + csvRows.join('\n')
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="brms_business_${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
})

// ── GET /api/partners/export/brms-partner — BRMS 협력사 대량등록 CSV ──
app.get('/export/brms-partner', (c) => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT p.company_name, p.business_number,
      z.zone_code, p.biz_member_name, p.representative_phone, p.biz_id,
      b.bank_name, b.account_number, b.account_holder
    FROM partners p
    LEFT JOIN zones z ON z.id = p.confirmed_zone_id
    LEFT JOIN bank_accounts b ON b.partner_id = p.id AND b.is_current = 1
    WHERE p.pipeline_stage = 'contracting' AND p.status IN ('contract_signed', 'brms_registering')
      AND p.deleted_at IS NULL
    ORDER BY p.updated_at DESC
  `).all() as Record<string, string | null>[]

  const header = '계좌 정보,협력사명,사업자등록번호,표준권역,비즈이름,비즈번호,비즈아이디'
  const csvRows = rows.map(r => {
    const accountInfo = [r.bank_name, r.account_number, r.account_holder].filter(Boolean).join('/')
    return [accountInfo, r.company_name, r.business_number, r.zone_code,
      r.biz_member_name, r.representative_phone, r.biz_id
    ].map(v => `"${(v ?? '').replace(/"/g, '""')}"`).join(',')
  })

  const csv = '\uFEFF' + header + '\n' + csvRows.join('\n')
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="brms_partner_${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
})

// ── GET /api/partners/stats — 대시보드 통계 ──
app.get('/stats/summary', (c) => {
  const db = getDb()

  const stageCounts = db.prepare(`
    SELECT pipeline_stage, COUNT(*) as count
    FROM partners WHERE deleted_at IS NULL
    GROUP BY pipeline_stage
  `).all()

  const recentWeek = db.prepare(`
    SELECT COUNT(*) as count FROM partners
    WHERE deleted_at IS NULL AND apply_date >= date('now', '-7 days')
  `).get() as { count: number }

  const contractTypeBreakdown = db.prepare(`
    SELECT contract_type, COUNT(*) as count
    FROM partners WHERE deleted_at IS NULL
    GROUP BY contract_type
  `).all()

  // 주간 인바운드 추이 (최근 12주)
  const weeklyTrend = db.prepare(`
    SELECT strftime('%Y-W%W', apply_date) as week, COUNT(*) as count
    FROM partners
    WHERE deleted_at IS NULL AND apply_date >= date('now', '-84 days')
    GROUP BY week ORDER BY week
  `).all()

  // 평균 단계별 소요일 (inbound → operating)
  const avgDays = db.prepare(`
    SELECT
      pipeline_stage,
      ROUND(AVG(julianday(updated_at) - julianday(apply_date)), 1) as avg_days
    FROM partners
    WHERE deleted_at IS NULL AND apply_date IS NOT NULL
    GROUP BY pipeline_stage
  `).all()

  // 상태별 분포
  const statusBreakdown = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM partners WHERE deleted_at IS NULL
    GROUP BY status ORDER BY count DESC
    LIMIT 15
  `).all()

  // 권역별 분포 (top 15)
  const zoneBreakdown = db.prepare(`
    SELECT z.zone_code, z.region_class, COUNT(*) as count
    FROM partners p
    JOIN zones z ON z.id = p.confirmed_zone_id
    WHERE p.deleted_at IS NULL AND p.pipeline_stage NOT IN ('terminated')
    GROUP BY z.zone_code ORDER BY count DESC
    LIMIT 15
  `).all()

  return c.json({
    stageCounts, recentWeekInbound: recentWeek.count, contractTypeBreakdown,
    weeklyTrend, avgDays, statusBreakdown, zoneBreakdown,
  })
})

export default app
