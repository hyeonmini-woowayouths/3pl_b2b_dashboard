/**
 * 국세청 사업자등록상태 조회 API
 *
 * 공공데이터포털: https://www.data.go.kr
 * API 명: 국세청_사업자등록정보 진위확인 및 상태조회 서비스
 * Endpoint: https://api.odcloud.kr/api/nts-businessman/v1/status
 *
 * tax_type_cd:
 *   01 = 부가가치세 일반과세자
 *   02 = 부가가치세 간이과세자 (세금계산서 미발급)
 *   03 = 부가가치세 과세특례자
 *   04 = 부가가치세 면세사업자
 *   05 = 수익사업을 영위하지 않는 비영리법인이나 국가기관 등
 *   06 = 고유번호가 부여된 단체
 *   07 = 부가가치세 간이과세자 (세금계산서 발급)
 *
 * 법인 판별: 사업자번호 10자리 중 3~4번째 자리가 81~89
 */

export type BusinessFormal = '일반과세' | '법인' | '간이과세' | '면세' | '기타'

export interface NtsResult {
  success: boolean
  businessNumber: string
  isActive: boolean         // 계속사업자 여부
  isCorporation: boolean    // 법인 여부
  taxType: string | null    // 원본 tax_type
  taxTypeCd: string | null  // 원본 tax_type_cd
  formal: BusinessFormal    // 우리 시스템 분류
  source: 'nts_api' | 'pattern_fallback'
  error?: string
}

/**
 * 사업자번호 10자리 중 3~4번째가 81~89면 법인
 */
function isCorporateByPattern(bizNum: string): boolean {
  const clean = bizNum.replace(/-/g, '')
  if (clean.length !== 10) return false
  const middle = clean.slice(3, 5)
  const n = Number(middle)
  return n >= 81 && n <= 89
}

/**
 * tax_type_cd + 법인 패턴으로 사업자 형태 분류
 */
function classifyFormal(taxTypeCd: string, isCorp: boolean): BusinessFormal {
  if (taxTypeCd === '02' || taxTypeCd === '07') return '간이과세'
  if (taxTypeCd === '04') return '면세'
  if (taxTypeCd === '01' || taxTypeCd === '03') return isCorp ? '법인' : '일반과세'
  return '기타'
}

/**
 * 국세청 API 호출 (실제)
 */
async function callNtsApi(bizNum: string, apiKey: string): Promise<NtsResult> {
  // 이중 인코딩 방지: 이미 인코딩된 키면 그대로, 원본 키면 한번 인코딩
  // data.go.kr에서 발급되는 키는 보통 %2B, %2F, %3D가 포함된 인코딩 상태
  const decoded = decodeURIComponent(apiKey)
  const url = `https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${encodeURIComponent(decoded)}`
  const clean = bizNum.replace(/-/g, '')

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ b_no: [clean] }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return fallbackByPattern(bizNum, `API error ${res.status}: ${text.slice(0, 100)}`)
    }

    const json = await res.json() as {
      status_code: string
      data: Array<{
        b_no: string
        b_stt: string
        b_stt_cd: string
        tax_type: string
        tax_type_cd: string
      }>
    }

    const item = json.data?.[0]
    if (!item || item.b_stt_cd === '') {
      return {
        success: false,
        businessNumber: bizNum,
        isActive: false,
        isCorporation: isCorporateByPattern(bizNum),
        taxType: null,
        taxTypeCd: null,
        formal: '기타',
        source: 'nts_api',
        error: '등록되지 않은 사업자번호입니다',
      }
    }

    const isCorp = isCorporateByPattern(bizNum)
    const formal = classifyFormal(item.tax_type_cd, isCorp)

    return {
      success: true,
      businessNumber: bizNum,
      isActive: item.b_stt_cd === '01',
      isCorporation: isCorp,
      taxType: item.tax_type,
      taxTypeCd: item.tax_type_cd,
      formal,
      source: 'nts_api',
    }
  } catch (e) {
    return fallbackByPattern(bizNum, `API call failed: ${e instanceof Error ? e.message : 'unknown'}`)
  }
}

/**
 * Fallback: 패턴 기반 판별 (API 키 없거나 장애 시)
 */
function fallbackByPattern(bizNum: string, note?: string): NtsResult {
  const isCorp = isCorporateByPattern(bizNum)
  return {
    success: true,
    businessNumber: bizNum,
    isActive: true,
    isCorporation: isCorp,
    taxType: isCorp ? '법인 (패턴 추정)' : '개인 (패턴 추정)',
    taxTypeCd: isCorp ? '01' : '01',
    formal: isCorp ? '법인' : '일반과세',
    source: 'pattern_fallback',
    error: note,
  }
}

/**
 * 국세청 진위확인 API — 사업자번호 + 대표자명 + (선택)개업일 매칭
 * Endpoint: POST /api/nts-businessman/v1/validate
 */
export interface ValidateIdentityResult {
  valid: boolean
  message: string
  source: 'nts_api' | 'skipped'
}

export async function validateBusinessIdentity(params: {
  businessNumber: string
  representativeName: string
  startDate?: string  // YYYYMMDD (국세청 API 필수)
  companyName?: string
}): Promise<ValidateIdentityResult> {
  const apiKey = process.env.NTS_API_KEY
  if (!apiKey) {
    return { valid: true, message: 'API 키 미설정 — 진위확인 스킵', source: 'skipped' }
  }

  // start_dt는 국세청 진위확인의 필수 파라미터. 없으면 스킵
  if (!params.startDate) {
    return {
      valid: true,
      message: '개업일 미제공 — 진위확인 스킵 (서류 검토 단계에서 확인 예정)',
      source: 'skipped',
    }
  }

  const clean = params.businessNumber.replace(/-/g, '')
  if (clean.length !== 10) return { valid: false, message: '사업자번호는 10자리여야 합니다', source: 'skipped' }

  const decoded = decodeURIComponent(apiKey)
  const url = `https://api.odcloud.kr/api/nts-businessman/v1/validate?serviceKey=${encodeURIComponent(decoded)}`

  try {
    const payload: Record<string, unknown> = {
      b_no: clean,
      start_dt: params.startDate,
      p_nm: params.representativeName,
    }
    if (params.companyName) payload.b_nm = params.companyName

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businesses: [payload] }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { valid: false, message: `API 오류 ${res.status}: ${text.slice(0, 100)}`, source: 'nts_api' }
    }

    const json = await res.json() as {
      status_code: string
      data: Array<{
        b_no: string
        valid: string  // '01' = 일치, '02' = 불일치
        valid_msg: string
        request_param: Record<string, string>
        status?: { b_no: string; b_stt_cd: string }
      }>
    }

    const item = json.data?.[0]
    if (!item) return { valid: false, message: '응답이 비어있습니다', source: 'nts_api' }

    const isValid = item.valid === '01'
    return {
      valid: isValid,
      message: isValid
        ? '사업자번호와 대표자명이 일치합니다'
        : `국세청 진위확인 불일치: ${item.valid_msg ?? '사업자번호와 대표자명이 일치하지 않습니다'}`,
      source: 'nts_api',
    }
  } catch (e) {
    return { valid: false, message: `API 호출 실패: ${e instanceof Error ? e.message : 'unknown'}`, source: 'nts_api' }
  }
}

export async function verifyBusinessNumber(bizNum: string): Promise<NtsResult> {
  const clean = bizNum.replace(/-/g, '')
  if (clean.length !== 10 || !/^\d{10}$/.test(clean)) {
    return {
      success: false,
      businessNumber: bizNum,
      isActive: false,
      isCorporation: false,
      taxType: null,
      taxTypeCd: null,
      formal: '기타',
      source: 'pattern_fallback',
      error: '사업자등록번호는 10자리 숫자여야 합니다',
    }
  }

  const apiKey = process.env.NTS_API_KEY
  if (!apiKey) {
    // 키 없으면 패턴 기반 fallback
    return fallbackByPattern(bizNum, 'NTS_API_KEY 미설정')
  }

  return await callNtsApi(bizNum, apiKey)
}
