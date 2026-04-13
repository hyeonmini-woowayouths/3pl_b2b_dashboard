/**
 * 협력사 셀프서비스 포털 API
 *
 * 인증 흐름:
 *  1. POST /api/portal/lookup — 사업자번호+전화번호 조회
 *  2. POST /api/portal/otp/send — 카카오 알림톡 OTP 발송 (dry-run)
 *  3. POST /api/portal/otp/verify — OTP 검증 → 세션 쿠키 발급
 *  4. 이후 요청은 portal_session 쿠키로 인증 (partnerPortalMiddleware)
 */
import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import crypto from 'crypto'
import { getDb } from './db'
import { sendProposal } from './integrations/n8n'
import { verifyBusinessNumber, validateBusinessIdentity } from './integrations/nts'

const app = new Hono()

// ── 유틸 ──
function hash(s: string) { return crypto.createHash('sha256').update(s).digest('hex') }
function genOtp() { return crypto.randomInt(100000, 999999).toString() }
function genToken() { return crypto.randomBytes(32).toString('hex') }
function genCode(len = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({length: len}, () => chars[crypto.randomInt(chars.length)]).join('')
}

function logAction(partnerId: string, action: string, details: Record<string, unknown> | null, ip: string, ua: string) {
  const db = getDb()
  db.prepare(`
    INSERT INTO portal_actions (partner_id, action, details, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?)
  `).run(partnerId, action, details ? JSON.stringify(details) : null, ip, ua)
}

// ── POST /verify-biznum — 국세청 사업자번호 조회 + 진위확인 (공개) ──
app.post('/verify-biznum', async (c) => {
  const { business_number, representative_name, start_date, company_name } = await c.req.json<{
    business_number: string
    representative_name?: string
    start_date?: string
    company_name?: string
  }>()
  if (!business_number) return c.json({ error: '사업자번호를 입력해주세요' }, 400)

  // 1. 상태 조회 (사업자 형태 판별)
  const status = await verifyBusinessNumber(business_number)

  // 2. 진위확인 (대표자명 필수 — 이름/사업자번호 일치 체크)
  let identity: Awaited<ReturnType<typeof validateBusinessIdentity>> | null = null
  if (representative_name) {
    identity = await validateBusinessIdentity({
      businessNumber: business_number,
      representativeName: representative_name,
      startDate: start_date,
      companyName: company_name,
    })
  }

  return c.json({ ...status, identity })
})

// ── POST /lookup — 사업자번호+전화번호 조회 ──
app.post('/lookup', async (c) => {
  const db = getDb()
  const { business_number, phone } = await c.req.json<{ business_number: string; phone: string }>()

  if (!business_number || !phone) {
    return c.json({ error: '사업자번호와 전화번호를 입력해주세요' }, 400)
  }

  const bizClean = business_number.replace(/-/g, '')
  const phoneClean = phone.replace(/-/g, '')

  // 모든 관련 레코드 조회 (종료된 것까지)
  const records = db.prepare(`
    SELECT id, company_name, pipeline_stage, status, applicant_name, phone, representative_phone,
           apply_date, operating_start_date, dp_code, business_type
    FROM partners
    WHERE business_number = ? AND deleted_at IS NULL
    ORDER BY updated_at DESC
  `).all(bizClean) as Array<Record<string, string | null>>

  if (records.length === 0) {
    return c.json({ type: 'new', partner: null })
  }

  // 전화번호 일치 검증 (보안)
  const matched = records.find(r => {
    const p1 = (r.phone ?? '').replace(/-/g, '')
    const p2 = (r.representative_phone ?? '').replace(/-/g, '')
    return p1 === phoneClean || p2 === phoneClean
  })

  if (!matched) {
    return c.json({ error: '사업자번호와 전화번호가 일치하지 않습니다' }, 403)
  }

  // 간이과세자 차단
  if (matched.business_type === '간이과세') {
    return c.json({ error: '간이과세자는 협력사 가입이 불가능합니다' }, 403)
  }

  // 분류
  const operating = records.find(r => r.pipeline_stage === 'operating')
  const inProgress = records.find(r => r.pipeline_stage !== 'terminated' && r.pipeline_stage !== 'operating')
  let type: 'new' | 'in_progress' | 'operating' | 'reapplication'
  let current: Record<string, string | null>

  if (operating) { type = 'operating'; current = operating }
  else if (inProgress) { type = 'in_progress'; current = inProgress }
  else { type = 'reapplication'; current = records[0]! }

  return c.json({
    type,
    partner: {
      id: current.id,
      company_name: current.company_name,
      pipeline_stage: current.pipeline_stage,
      status: current.status,
      applicant_name: current.applicant_name,
      dp_code: current.dp_code,
    },
    history: records.length,
  })
})

// ── POST /otp/send — OTP 발송 ──
app.post('/otp/send', async (c) => {
  const db = getDb()
  const { business_number, phone, partner_id } = await c.req.json<{ business_number: string; phone: string; partner_id: string }>()

  // Rate limit: 10분에 3회
  const recent = db.prepare(`
    SELECT COUNT(*) as c FROM partner_otps
    WHERE business_number = ? AND created_at > datetime('now', '-10 minutes')
  `).get(business_number.replace(/-/g, '')) as { c: number }
  if (recent.c >= 3) {
    return c.json({ error: '10분에 최대 3회까지 발송 가능합니다' }, 429)
  }

  const otp = genOtp()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  db.prepare(`
    INSERT INTO partner_otps (partner_id, business_number, phone, code_hash, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(partner_id, business_number.replace(/-/g, ''), phone.replace(/-/g, ''), hash(otp), expiresAt)

  // 카카오 알림톡 (n8n) — dry-run
  console.log(`[OTP dry-run] partner=${partner_id} phone=${phone} code=${otp}`)

  return c.json({
    ok: true,
    dryRun: process.env.EXTERNAL_API_LIVE !== 'true',
    // 개발 편의: dry-run에서는 OTP 노출 (운영은 제거)
    devCode: process.env.EXTERNAL_API_LIVE !== 'true' ? otp : undefined,
  })
})

// ── POST /otp/verify — OTP 검증 + 세션 발급 ──
app.post('/otp/verify', async (c) => {
  const db = getDb()
  const { business_number, phone, code } = await c.req.json<{ business_number: string; phone: string; code: string }>()

  const bizClean = business_number.replace(/-/g, '')
  const phoneClean = phone.replace(/-/g, '')

  const otp = db.prepare(`
    SELECT * FROM partner_otps
    WHERE business_number = ? AND phone = ? AND verified = 0 AND expires_at > datetime('now')
    ORDER BY created_at DESC LIMIT 1
  `).get(bizClean, phoneClean) as { id: string; partner_id: string; code_hash: string; attempts: number } | undefined

  if (!otp) {
    return c.json({ error: '유효한 인증코드가 없습니다. 다시 발송해주세요' }, 400)
  }

  if (otp.attempts >= 5) {
    return c.json({ error: '시도 횟수 초과. 10분 후 다시 시도해주세요' }, 429)
  }

  if (hash(code) !== otp.code_hash) {
    db.prepare('UPDATE partner_otps SET attempts = attempts + 1 WHERE id = ?').run(otp.id)
    return c.json({ error: '인증코드가 일치하지 않습니다', remaining: 5 - otp.attempts - 1 }, 400)
  }

  // 검증 성공
  db.prepare('UPDATE partner_otps SET verified = 1 WHERE id = ?').run(otp.id)

  // 세션 생성
  const token = genToken()
  const tokenHash = hash(token)
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const ip = c.req.header('x-forwarded-for') ?? 'unknown'
  const ua = c.req.header('user-agent') ?? 'unknown'

  db.prepare(`
    INSERT INTO partner_sessions (token_hash, partner_id, business_number, phone, ip_address, user_agent, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(tokenHash, otp.partner_id, bizClean, phoneClean, ip, ua, expiresAt)

  logAction(otp.partner_id, 'login', null, ip, ua)

  setCookie(c, 'portal_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: 30 * 60,
  })

  return c.json({ ok: true })
})

// ── 인증 미들웨어 ──
async function requirePortalAuth(c: import('hono').Context, next: import('hono').Next) {
  const token = getCookie(c, 'portal_session')
  if (!token) return c.json({ error: '인증이 필요합니다' }, 401)

  const db = getDb()
  const session = db.prepare(`
    SELECT * FROM partner_sessions WHERE token_hash = ? AND expires_at > datetime('now')
  `).get(hash(token)) as { partner_id: string; business_number: string } | undefined

  if (!session) {
    deleteCookie(c, 'portal_session')
    return c.json({ error: '세션이 만료되었습니다' }, 401)
  }

  // Sliding window: 활동 시각 + 만료 연장
  const newExpires = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  db.prepare(`
    UPDATE partner_sessions SET last_activity = datetime('now'), expires_at = ? WHERE token_hash = ?
  `).run(newExpires, hash(token))

  c.set('portalSession', session)
  return next()
}

// ── GET /me — 내 정보 ──
app.get('/me', requirePortalAuth, (c) => {
  const db = getDb()
  const session = c.get('portalSession') as { partner_id: string }

  const partner = db.prepare(`
    SELECT p.*, z.zone_code AS confirmed_zone_code, z.rgn1, z.rgn2
    FROM partners p LEFT JOIN zones z ON z.id = p.confirmed_zone_id
    WHERE p.id = ?
  `).get(session.partner_id) as Record<string, unknown>

  // 민감 필드 마스킹
  if (partner) {
    const bizNum = partner.business_number as string | null
    if (bizNum && bizNum.length >= 5) partner.business_number = bizNum.slice(0,3) + '-**-***' + bizNum.slice(-2)
  }

  // 서류 상태
  const documents = db.prepare(`
    SELECT doc_type, status, rejection_reason, reviewed_at
    FROM partner_documents WHERE partner_id = ? ORDER BY doc_type
  `).all(session.partner_id)

  // 최근 이력
  const history = db.prepare(`
    SELECT from_stage, from_status, to_stage, to_status, reason, created_at
    FROM partner_status_logs WHERE partner_id = ? ORDER BY created_at DESC LIMIT 20
  `).all(session.partner_id)

  // 제안서 코드 유효 여부
  const proposalCode = db.prepare(`
    SELECT id, view_count, max_views, expires_at
    FROM proposal_codes
    WHERE partner_id = ? AND expires_at > datetime('now')
    ORDER BY created_at DESC LIMIT 1
  `).get(session.partner_id) as Record<string, unknown> | undefined

  // 권역 신청 이력
  const zoneRequest = db.prepare(`
    SELECT r.id, r.request_type, r.status, r.created_at, r.decision_reason,
           z.zone_code AS to_zone_code
    FROM zone_change_requests r
    LEFT JOIN zones z ON z.id = r.to_zone_id
    WHERE r.partner_id = ? ORDER BY r.created_at DESC LIMIT 5
  `).all(session.partner_id)

  // 계약
  const contracts = db.prepare(`
    SELECT id, template_type, signok_status, sent_date, signed_date, contract_start_date
    FROM contracts WHERE partner_id = ? ORDER BY created_at DESC
  `).all(session.partner_id)

  return c.json({ partner, documents, history, proposalCode: proposalCode ? { hasActive: true, viewsLeft: (proposalCode.max_views as number) - (proposalCode.view_count as number) } : null, zoneRequest, contracts })
})

// ── POST /logout ──
app.post('/logout', requirePortalAuth, (c) => {
  const token = getCookie(c, 'portal_session')
  if (token) {
    getDb().prepare('DELETE FROM partner_sessions WHERE token_hash = ?').run(hash(token))
  }
  deleteCookie(c, 'portal_session')
  return c.json({ ok: true })
})

// ── POST /apply — 신규 신청 (인증 불필요) ──
app.post('/apply', async (c) => {
  const db = getDb()
  const body = await c.req.json<{
    applicant_name: string; phone: string; business_number: string;
    representative_name?: string;
    company_name: string; email?: string;
    desired_zone_1_id?: string; desired_zone_2_id?: string;
    experience_years?: string; rider_count?: string; platform_experience?: string; comment?: string;
  }>()

  const bizClean = body.business_number.replace(/-/g, '')

  // 서버 측 국세청 상태 재검증
  const verify = await verifyBusinessNumber(bizClean)
  if (!verify.success || !verify.isActive) {
    return c.json({ error: verify.error ?? '사업자등록 상태를 확인할 수 없습니다' }, 400)
  }
  if (verify.formal === '간이과세') {
    return c.json({ error: '간이과세자는 협력사 가입이 불가능합니다' }, 400)
  }

  // 서버 측 진위확인 (대표자명 필수)
  const repName = body.representative_name ?? body.applicant_name
  const identity = await validateBusinessIdentity({
    businessNumber: bizClean,
    representativeName: repName,
    companyName: body.company_name,
  })
  if (!identity.valid) {
    return c.json({ error: identity.message }, 400)
  }

  // 서버가 확정한 business_type 사용 (클라이언트 값 무시)
  const businessType = verify.formal

  // 진행중/운영중 차단
  const blocker = db.prepare(`
    SELECT id, pipeline_stage FROM partners
    WHERE business_number = ? AND deleted_at IS NULL AND pipeline_stage != 'terminated'
  `).get(bizClean) as { id: string; pipeline_stage: string } | undefined
  if (blocker) {
    return c.json({ error: `이미 ${blocker.pipeline_stage} 단계에 있는 사업자입니다` }, 409)
  }

  const now = new Date().toISOString()
  const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  // 희망지역 텍스트: 1지망 + 2지망 권역 코드로 구성
  let desiredText: string | null = null
  if (body.desired_zone_1_id) {
    const z1 = db.prepare('SELECT zone_code FROM zones WHERE id = ?').get(body.desired_zone_1_id) as { zone_code: string } | undefined
    const z2 = body.desired_zone_2_id ? db.prepare('SELECT zone_code FROM zones WHERE id = ?').get(body.desired_zone_2_id) as { zone_code: string } | undefined : undefined
    desiredText = [z1?.zone_code, z2?.zone_code].filter(Boolean).join(', ')
  }

  db.prepare(`
    INSERT INTO partners (
      id, contract_type, pipeline_stage, status,
      apply_date, company_name, applicant_name, representative_name, email,
      phone, representative_phone,
      business_type, business_number,
      desired_region_text, desired_zone_1_id, desired_zone_2_id,
      experience_years, rider_count, platform_experience, comment,
      created_at, updated_at
    ) VALUES (?, 'direct', 'inbound', 'submitted', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, now.slice(0,10), body.company_name, body.applicant_name, repName, body.email ?? null,
    body.phone.replace(/-/g, ''), body.phone.replace(/-/g, ''),
    businessType, bizClean, desiredText,
    body.desired_zone_1_id ?? null, body.desired_zone_2_id ?? null,
    body.experience_years ?? null, body.rider_count ?? null,
    body.platform_experience ?? null, body.comment ?? null, now, now)

  return c.json({ ok: true, id })
})

// ── POST /documents/:docType — 서류 업로드 (파일 URL만 — 실제 업로드는 n8n/Drive) ──
app.post('/documents/:docType', requirePortalAuth, async (c) => {
  const db = getDb()
  const session = c.get('portalSession') as { partner_id: string }
  const docType = c.req.param('docType')
  const { file_url, file_name } = await c.req.json<{ file_url: string; file_name: string }>()

  const existing = db.prepare(
    'SELECT id FROM partner_documents WHERE partner_id = ? AND doc_type = ?'
  ).get(session.partner_id, docType) as { id: string } | undefined

  const now = new Date().toISOString()
  if (existing) {
    db.prepare(`UPDATE partner_documents SET status='submitted', file_url=?, drive_file_name=?, rejection_reason=NULL, updated_at=? WHERE id=?`).run(file_url, file_name, now, existing.id)
  } else {
    db.prepare(`INSERT INTO partner_documents (partner_id, doc_type, status, file_url, drive_file_name, created_at, updated_at) VALUES (?, ?, 'submitted', ?, ?, ?, ?)`).run(session.partner_id, docType, file_url, file_name, now, now)
  }

  logAction(session.partner_id, 'upload_document', { doc_type: docType, file_name }, '', '')
  return c.json({ ok: true })
})

// ── POST /proposal/view — 보안코드로 제안서 조회 ──
app.post('/proposal/view', requirePortalAuth, async (c) => {
  const db = getDb()
  const session = c.get('portalSession') as { partner_id: string }
  const { code } = await c.req.json<{ code: string }>()

  const pc = db.prepare(`
    SELECT * FROM proposal_codes
    WHERE partner_id = ? AND code_hash = ? AND expires_at > datetime('now')
  `).get(session.partner_id, hash(code)) as Record<string, unknown> | undefined

  if (!pc) return c.json({ error: '유효하지 않거나 만료된 코드입니다' }, 403)

  if ((pc.view_count as number) >= (pc.max_views as number)) {
    return c.json({ error: '조회 횟수를 초과했습니다' }, 403)
  }

  db.prepare(`UPDATE proposal_codes SET view_count = view_count + 1 WHERE id = ?`).run(pc.id)

  // 권역 후보: 희망지역 기반 Set Tracker 가능 권역
  const partner = db.prepare('SELECT desired_region_text FROM partners WHERE id = ?').get(session.partner_id) as { desired_region_text: string | null }
  const desiredText = partner?.desired_region_text ?? ''
  const tokens = desiredText.split(/\s+/).map(t => t.replace(/(시|구|군|읍|면|동)$/, '')).filter(Boolean)

  let candidates: unknown[] = []
  if (tokens.length > 0) {
    const sql = `SELECT * FROM zones WHERE is_open = 1 AND set_tracker_available = 1 AND (
      ${tokens.map(() => '(rgn1 LIKE ? OR rgn2 LIKE ? OR zone_code LIKE ?)').join(' AND ')}
    ) ORDER BY zone_code LIMIT 10`
    const params: unknown[] = []
    for (const t of tokens) params.push(`%${t}%`, `%${t}%`, `%${t}%`)
    candidates = db.prepare(sql).all(...params)
  }

  logAction(session.partner_id, 'view_proposal', { view_count: (pc.view_count as number) + 1 }, '', '')

  return c.json({
    ok: true,
    viewsLeft: (pc.max_views as number) - (pc.view_count as number) - 1,
    candidates,
    terms: {
      pickupFee: 700, deliveryFee: 700, distanceFeePerUnit: 80,
      weatherBonus: 500, sla: '주 25/28 슬롯 + 수락률 80%+',
      managementFeeBase: 300,
    }
  })
})

// ── POST /zone/select — 권역 선택 (운영자 승인 대기) ──
app.post('/zone/select', requirePortalAuth, async (c) => {
  const db = getDb()
  const session = c.get('portalSession') as { partner_id: string }
  const { zone_id, reason } = await c.req.json<{ zone_id: string; reason?: string }>()

  // 이미 대기 중인 초기 신청 있으면 차단
  const pending = db.prepare(`
    SELECT id FROM zone_change_requests
    WHERE partner_id = ? AND request_type = 'initial' AND status = 'pending'
  `).get(session.partner_id) as { id: string } | undefined
  if (pending) return c.json({ error: '이미 권역 선택 신청이 검토 중입니다' }, 409)

  db.prepare(`
    INSERT INTO zone_change_requests (partner_id, request_type, to_zone_id, reason)
    VALUES (?, 'initial', ?, ?)
  `).run(session.partner_id, zone_id, reason ?? null)

  logAction(session.partner_id, 'select_zone', { zone_id, reason }, '', '')
  return c.json({ ok: true, message: '운영팀 승인 대기 중입니다 (2영업일 내 결과 안내)' })
})

// ── POST /set/request — 세트 변경 신청 ──
app.post('/set/request', requirePortalAuth, async (c) => {
  const db = getDb()
  const session = c.get('portalSession') as { partner_id: string }
  const { requested_sets, effective_week, reason } = await c.req.json<{ requested_sets: number; effective_week?: string; reason?: string }>()

  db.prepare(`
    INSERT INTO set_change_requests (partner_id, requested_sets, effective_week, reason)
    VALUES (?, ?, ?, ?)
  `).run(session.partner_id, requested_sets, effective_week ?? null, reason ?? null)

  logAction(session.partner_id, 'request_set_change', { requested_sets, effective_week }, '', '')
  return c.json({ ok: true })
})

// ── POST /info/request — 정보 변경 신청 ──
app.post('/info/request', requirePortalAuth, async (c) => {
  const db = getDb()
  const session = c.get('portalSession') as { partner_id: string }
  const { field_type, new_value, reason } = await c.req.json<{ field_type: string; new_value: string; reason?: string }>()

  db.prepare(`
    INSERT INTO info_change_requests (partner_id, field_type, new_value, reason)
    VALUES (?, ?, ?, ?)
  `).run(session.partner_id, field_type, new_value, reason ?? null)

  logAction(session.partner_id, 'request_info_change', { field_type, new_value }, '', '')
  return c.json({ ok: true })
})

export default app
