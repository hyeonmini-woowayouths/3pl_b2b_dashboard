/**
 * n8n Webhook 클라이언트
 * 모든 외부 서비스 연동은 n8n을 통해 수행 (PRD 4.3)
 * EXTERNAL_API_LIVE=false일 때는 dry-run (로깅만)
 */
import { integrationConfig } from './config'

interface WebhookResult {
  success: boolean
  dryRun: boolean
  data?: unknown
  error?: string
}

async function callWebhook(url: string, payload: unknown): Promise<WebhookResult> {
  if (!integrationConfig.isLive) {
    console.log(`[n8n dry-run] POST ${url}`)
    console.log(`  payload:`, JSON.stringify(payload, null, 2).slice(0, 500))
    return { success: true, dryRun: true, data: { message: 'dry-run mode' } }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    return { success: res.ok, dryRun: false, data }
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error'
    console.error(`[n8n error] ${url}:`, error)
    return { success: false, dryRun: false, error }
  }
}

/**
 * F-11: 보안 제안서 자동 발송
 * 앱스크립트 기반 프로세스를 대체
 * n8n에서: 인증코드 생성 → 제안서 링크 생성 → 이메일 발송
 */
export async function sendProposal(params: {
  partnerId: string
  companyName: string
  email: string
  phone: string
  desiredRegion: string
}) {
  return callWebhook(integrationConfig.n8n.proposal, {
    type: 'proposal_send',
    ...params,
    timestamp: new Date().toISOString(),
  })
}

/**
 * F-12: 서류 보완 알림톡 발송
 * 카카오 알림톡 템플릿: BIZ_DOC_RESUBMIT
 */
export async function sendDocReminder(params: {
  partnerId: string
  companyName: string
  phone: string
  rejectionReasons: string[]
}) {
  return callWebhook(integrationConfig.n8n.docRemind, {
    type: 'doc_remind',
    templateCode: 'BIZ_DOC_RESUBMIT',
    ...params,
    timestamp: new Date().toISOString(),
  })
}

/**
 * F-14: Google Drive 폴더 생성 + 파일 리네임/업로드
 * 파일명 규칙: [상호명]_[사업자번호]_[지역]
 */
export async function createDriveFolder(params: {
  partnerId: string
  companyName: string
  businessNumber: string
  region: string
}) {
  const folderName = `${params.companyName}_${params.businessNumber}_${params.region}`
  return callWebhook(integrationConfig.n8n.driveUpload, {
    type: 'create_folder',
    folderName,
    parentFolderId: integrationConfig.gdrive.rootFolderId,
    ...params,
    timestamp: new Date().toISOString(),
  })
}

/**
 * F-15: Slack 알림
 * 이벤트 유형: 서류 반려, 계약 체결, 운영중 전환 등
 */
export async function sendSlackNotification(params: {
  event: 'doc_rejected' | 'contract_signed' | 'operating_started' | 'brms_registered' | 'stage_changed'
  partnerId: string
  companyName: string
  details: string
  channel?: string
}) {
  return callWebhook(integrationConfig.n8n.slackNotify, {
    type: 'slack_notify',
    channel: params.channel ?? '#3pl-온보딩-알림',
    ...params,
    timestamp: new Date().toISOString(),
  })
}

/**
 * F-17 (Phase 3): OCR 파싱 — Bedrock Vision
 * 사업자등록증 이미지 → 정형 JSON
 */
export async function parseBusinessCert(params: {
  partnerId: string
  imageUrl: string
}) {
  return callWebhook(integrationConfig.n8n.ocrParse, {
    type: 'ocr_business_cert',
    ...params,
    timestamp: new Date().toISOString(),
  })
}
