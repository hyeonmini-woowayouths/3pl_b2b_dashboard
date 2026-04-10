/**
 * 외부 연동 API 라우트
 * /api/integrations/*
 */
import { Hono } from 'hono'
import { getDb } from './db'
import { sendProposal, sendDocReminder, createDriveFolder, sendSlackNotification } from './integrations/n8n'
import { sendContract, resolveTemplate, getContractStatus } from './integrations/signok'

const app = new Hono()

// ── POST /api/integrations/proposal — F-11: 보안 제안서 발송 ──
app.post('/proposal', async (c) => {
  const db = getDb()
  const { partnerId } = await c.req.json<{ partnerId: string }>()

  const partner = db.prepare(`SELECT * FROM partners WHERE id = ?`).get(partnerId) as Record<string, string> | undefined
  if (!partner) return c.json({ error: 'Partner not found' }, 404)

  const result = await sendProposal({
    partnerId,
    companyName: partner.company_name ?? '',
    email: partner.email ?? '',
    phone: partner.phone ?? '',
    desiredRegion: partner.desired_region_text ?? '',
  })

  if (result.success) {
    db.prepare(`UPDATE partners SET proposal_sent = 'Y', proposal_date = ?, status = 'proposal_sent', updated_at = ? WHERE id = ?`)
      .run(new Date().toISOString().slice(0, 10), new Date().toISOString(), partnerId)

    await sendSlackNotification({
      event: 'stage_changed',
      partnerId,
      companyName: partner.company_name ?? '',
      details: '보안 제안서 발송 완료',
    })
  }

  return c.json({ ok: result.success, dryRun: result.dryRun, error: result.error })
})

// ── POST /api/integrations/doc-remind — F-12: 서류 보완 알림톡 ──
app.post('/doc-remind', async (c) => {
  const db = getDb()
  const { partnerId } = await c.req.json<{ partnerId: string }>()

  const partner = db.prepare(`SELECT * FROM partners WHERE id = ?`).get(partnerId) as Record<string, string> | undefined
  if (!partner) return c.json({ error: 'Partner not found' }, 404)

  const rejectedDocs = db.prepare(
    `SELECT doc_type, rejection_reason FROM partner_documents WHERE partner_id = ? AND status = 'rejected'`
  ).all(partnerId) as { doc_type: string; rejection_reason: string }[]

  const result = await sendDocReminder({
    partnerId,
    companyName: partner.company_name ?? '',
    phone: partner.phone ?? partner.representative_phone ?? '',
    rejectionReasons: rejectedDocs.map(d => `${d.doc_type}: ${d.rejection_reason}`),
  })

  return c.json({ ok: result.success, dryRun: result.dryRun, docsReminded: rejectedDocs.length })
})

// ── POST /api/integrations/drive-folder — F-14: Drive 폴더 생성 ──
app.post('/drive-folder', async (c) => {
  const db = getDb()
  const { partnerId } = await c.req.json<{ partnerId: string }>()

  const partner = db.prepare(`
    SELECT p.*, z.zone_code FROM partners p
    LEFT JOIN zones z ON z.id = p.confirmed_zone_id
    WHERE p.id = ?
  `).get(partnerId) as Record<string, string> | undefined
  if (!partner) return c.json({ error: 'Partner not found' }, 404)

  const result = await createDriveFolder({
    partnerId,
    companyName: partner.company_name ?? '',
    businessNumber: partner.business_number ?? '',
    region: partner.desired_region_text ?? partner.zone_code ?? '',
  })

  if (result.success && result.data) {
    db.prepare(`UPDATE partners SET drive_folder_link = ?, updated_at = ? WHERE id = ?`)
      .run(`https://drive.google.com/drive/folders/mock_${partnerId}`, new Date().toISOString(), partnerId)
  }

  return c.json({ ok: result.success, dryRun: result.dryRun })
})

// ── POST /api/integrations/contract-send — F-13: 싸인오케이 계약서 발송 ──
app.post('/contract-send', async (c) => {
  const db = getDb()
  const { partnerId } = await c.req.json<{ partnerId: string }>()

  const partner = db.prepare(`
    SELECT p.*, z.zone_code,
      b.bank_name, b.account_number, b.account_holder
    FROM partners p
    LEFT JOIN zones z ON z.id = p.confirmed_zone_id
    LEFT JOIN bank_accounts b ON b.partner_id = p.id AND b.is_current = 1
    WHERE p.id = ?
  `).get(partnerId) as Record<string, string> | undefined
  if (!partner) return c.json({ error: 'Partner not found' }, 404)

  const template = resolveTemplate(partner.pricing_plan)
  const bankInfo = [partner.bank_name, partner.account_number, partner.account_holder].filter(Boolean).join('/')
  const now = new Date().toISOString()

  const result = await sendContract({
    partnerId,
    template,
    recipientEmail: partner.email ?? '',
    recipientName: partner.representative_name ?? partner.applicant_name ?? '',
    recipientPhone: partner.representative_phone ?? partner.phone ?? '',
    contractDate: now.slice(0, 10),
    companyName: partner.company_name ?? '',
    companyAddress: partner.business_address ?? '',
    representativeName: partner.representative_name ?? '',
    bankInfo,
    businessNumber: partner.business_number ?? '',
    deliveryRegion: partner.desired_region_text ?? '',
    orderPeriod: '',
  })

  if (result.success) {
    // 계약 레코드 생성
    db.prepare(`
      INSERT INTO contracts (id, partner_id, template_type, signok_status, signok_doc_id, sent_date, created_at)
      VALUES (lower(hex(randomblob(16))), ?, ?, 'sent', ?, ?, ?)
    `).run(partnerId, template, result.documentId ?? null, now.slice(0, 10), now)

    // 파트너 상태 업데이트
    db.prepare(`UPDATE partners SET status = 'contract_sent', contract_template = ?, updated_at = ? WHERE id = ?`)
      .run(template, now, partnerId)

    // 상태 이력
    db.prepare(`
      INSERT INTO partner_status_logs (id, partner_id, from_stage, from_status, to_stage, to_status, reason, created_at)
      VALUES (lower(hex(randomblob(16))), ?, 'contracting', 'contract_sending', 'contracting', 'contract_sent', ?, ?)
    `).run(partnerId, `싸인오케이 발송 (템플릿: ${template})`, now)

    await sendSlackNotification({
      event: 'stage_changed',
      partnerId,
      companyName: partner.company_name ?? '',
      details: `계약서 발송 완료 (${template})`,
    })
  }

  return c.json({ ok: result.success, dryRun: result.dryRun, template, documentId: result.documentId })
})

// ── GET /api/integrations/contract-status/:docId — 계약 체결 상태 확인 ──
app.get('/contract-status/:docId', async (c) => {
  const docId = c.req.param('docId')
  const result = await getContractStatus(docId)
  return c.json(result)
})

// ── POST /api/integrations/slack-notify — F-15: 수동 Slack 알림 ──
app.post('/slack-notify', async (c) => {
  const body = await c.req.json<{
    event: 'doc_rejected' | 'contract_signed' | 'operating_started' | 'brms_registered' | 'stage_changed'
    partnerId: string
    companyName: string
    details: string
  }>()

  const result = await sendSlackNotification(body)
  return c.json({ ok: result.success, dryRun: result.dryRun })
})

export default app
