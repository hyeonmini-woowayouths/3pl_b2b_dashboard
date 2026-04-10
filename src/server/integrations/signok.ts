/**
 * F-13: 싸인오케이 API 클라이언트
 * 계약서 발송 + 체결 확인
 *
 * 7개 템플릿: 서울A, 서울B&경인A, 경인B, 지방, 창원진해A, 경기과천A, 로드러너
 * 권역 → 템플릿 자동 매핑 로직 포함
 */
import { integrationConfig } from './config'

interface SignOkResult {
  success: boolean
  dryRun: boolean
  documentId?: string
  error?: string
}

// 권역 → 싸인오케이 발송 템플릿 매핑
const TEMPLATE_MAP: Record<string, string> = {
  '서울A': '서울A',
  '서울B': '서울B&경인A',
  '서울C': '서울B&경인A',
  '경인A': '서울B&경인A',
  '경인B': '경인B',
  '지방': '지방',
  '창원진해A': '창원진해A',
  '경기과천A': '경기과천A',
  '로드러너': '로드러너',
}

export function resolveTemplate(pricingPlan: string | null): string {
  if (!pricingPlan) return '지방'
  return TEMPLATE_MAP[pricingPlan] ?? '지방'
}

/**
 * 계약서 발송
 */
export async function sendContract(params: {
  partnerId: string
  template: string
  recipientEmail: string
  recipientName: string
  recipientPhone: string
  contractDate: string
  companyName: string
  companyAddress: string
  representativeName: string
  bankInfo: string
  businessNumber: string
  deliveryRegion: string
  orderPeriod: string
}): Promise<SignOkResult> {
  if (!integrationConfig.isLive) {
    console.log(`[싸인오케이 dry-run] 계약서 발송`)
    console.log(`  템플릿: ${params.template}`)
    console.log(`  수신: ${params.recipientName} (${params.recipientEmail})`)
    console.log(`  변수:`, JSON.stringify(params, null, 2).slice(0, 500))
    return { success: true, dryRun: true, documentId: `MOCK_DOC_${Date.now()}` }
  }

  try {
    const res = await fetch(`${integrationConfig.signok.apiUrl}/documents/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${integrationConfig.signok.apiKey}`,
      },
      body: JSON.stringify({
        template_name: params.template,
        sender_email: integrationConfig.signok.senderEmail,
        recipients: [{
          email: params.recipientEmail,
          name: params.recipientName,
          phone: params.recipientPhone,
          role: 'signer',
        }],
        variables: {
          계약일자: params.contractDate,
          업체명: params.companyName,
          업체주소: params.companyAddress,
          대표자명: params.representativeName,
          계좌정보: params.bankInfo,
          사업자번호: params.businessNumber,
          이메일주소: params.recipientEmail,
          발주기간: params.orderPeriod,
          배달지역: params.deliveryRegion,
        },
      }),
    })

    const data = await res.json() as { document_id?: string; error?: string }
    if (!res.ok) return { success: false, dryRun: false, error: data.error ?? res.statusText }
    return { success: true, dryRun: false, documentId: data.document_id }
  } catch (e) {
    return { success: false, dryRun: false, error: e instanceof Error ? e.message : 'Unknown' }
  }
}

/**
 * 계약서 체결 상태 조회
 */
export async function getContractStatus(documentId: string): Promise<{
  status: 'pending' | 'signed' | 'rejected' | 'expired'
  signedAt?: string
}> {
  if (!integrationConfig.isLive) {
    console.log(`[싸인오케이 dry-run] 상태 조회: ${documentId}`)
    return { status: 'pending' }
  }

  const res = await fetch(`${integrationConfig.signok.apiUrl}/documents/${documentId}`, {
    headers: { 'Authorization': `Bearer ${integrationConfig.signok.apiKey}` },
  })
  return res.json() as Promise<{ status: 'pending' | 'signed' | 'rejected' | 'expired'; signedAt?: string }>
}
