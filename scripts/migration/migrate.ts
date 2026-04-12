/**
 * 데이터 마이그레이션 스크립트
 * xlsx (협력사 지원 퍼널 관리) → SQLite DB
 *
 * 대상 시트:
 *   ★인바운드 → partners (inbound 단계)
 *   ★계약자 리스트 → partners + contracts + bank_accounts (doc_review~operating)
 *
 * 실행: npm run db:migrate
 *
 * ⚠️ Security Note: 이 스크립트는 PII(사업자번호, 대표자명, 계좌번호, 연락처 등)를 처리합니다.
 *    로컬 개발 환경에서만 실행하세요. 운영 환경에서는 암호화 적용 후 사용.
 */

import XLSX from 'xlsx'
import Database from 'better-sqlite3'
import { readFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..', '..')
const XLSX_PATH = join(PROJECT_ROOT, '..', '3pl', 'docs', 'sources', 'sheets', '협력사 지원 퍼널 관리 24`.xlsx')
const DB_DIR = join(PROJECT_ROOT, 'data')
const DB_PATH = join(DB_DIR, 'dashboard.db')
const SCHEMA_PATH = join(PROJECT_ROOT, 'src', 'db', 'schema.sql')

// ── helpers ──────────────────────────────────────────────

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function normalizeDate(val: unknown): string | null {
  if (val == null || val === '' || val === '-' || val === '#N/A' || val === '#REF!') return null

  // JS Date 객체 (cellDates: true 사용 시)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null
    return val.toISOString().slice(0, 10)
  }

  const s = String(val).trim()

  // "20240507" 형태
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  }
  // "20240507.0" 형태
  if (/^\d{8}\.\d+$/.test(s)) {
    const d = s.split('.')[0]!
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
  }
  // "2024-05-07 00:00:00" 형태
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10)
  }
  // "Thu May 02 2024 ..." 형태 (JS Date.toString())
  const dateStrMatch = s.match(/^[A-Z][a-z]{2}\s+([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{4})/)
  if (dateStrMatch) {
    const months: Record<string, string> = {
      Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
      Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'
    }
    const m = months[dateStrMatch[1]!]
    if (m) return `${dateStrMatch[3]}-${m}-${dateStrMatch[2]!.padStart(2, '0')}`
  }
  // Excel serial date number
  const num = Number(s)
  if (!isNaN(num) && num > 40000 && num < 50000) {
    const date = new Date((num - 25569) * 86400 * 1000)
    return date.toISOString().slice(0, 10)
  }
  // 어떤 형식이든 Date로 파싱 시도
  const parsed = new Date(s)
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2020 && parsed.getFullYear() <= 2030) {
    return parsed.toISOString().slice(0, 10)
  }

  return null // 파싱 불가능한 날짜는 null
}

function normalizeStr(val: unknown): string | null {
  if (val == null || val === '' || val === '-' || val === '#N/A' || val === '#REF!' || val === '#VALUE!') return null
  return String(val).trim().replace(/\t/g, '')
}

function normalizePhone(val: unknown): string | null {
  const s = normalizeStr(val)
  if (!s) return null
  // 숫자만 추출 후 포매팅
  const digits = s.replace(/[^0-9]/g, '')
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  return s
}

function inferPipelineStage(row: {
  docReviewResult: string | null
  proposalSent: string | null
  contractProgress: string | null
  dpCode: string | null
  contractStatus: string | null
}): { stage: string; status: string } {
  // 계약자 리스트에 있으면 최소 doc_review 이상
  if (row.dpCode) {
    if (row.contractStatus === '계약종료') return { stage: 'terminated', status: 'contract_ended' }
    return { stage: 'operating', status: 'active' }
  }
  if (row.contractStatus === '체결') return { stage: 'contracting', status: 'contract_signed' }
  if (row.contractStatus === '계약대기' || row.contractStatus === '발송') return { stage: 'contracting', status: 'contract_sent' }

  return { stage: 'doc_review', status: 'docs_approved' }
}

function inferInboundStatus(row: {
  docReviewResult: string | null
  proposalSent: string | null
  dropReason: string | null
  callResult: string | null
  contractProgress: string | null
  phoneValidation: string | null
}): { stage: string; status: string } {
  if (row.contractProgress === '계약완료' || row.contractProgress === '완료') {
    return { stage: 'contracting', status: 'contract_signed' }
  }
  if (row.contractProgress === '드랍' || row.dropReason === '드랍') {
    return { stage: 'inbound', status: 'dropped' }
  }
  if (row.phoneValidation === '탈락') {
    return { stage: 'inbound', status: 'validation_failed' }
  }
  if (row.docReviewResult === '통과') {
    return { stage: 'inbound', status: 'consulting' }
  }
  if (row.docReviewResult === '유효성검사 탈락') {
    return { stage: 'inbound', status: 'validation_failed' }
  }
  if (row.proposalSent === '완료' || row.proposalSent === 'Y') {
    return { stage: 'inbound', status: 'proposal_sent' }
  }
  return { stage: 'inbound', status: 'submitted' }
}

// ── main ──────────────────────────────────────────────

function main() {
  console.log('📦 마이그레이션 시작...')
  console.log(`   xlsx: ${XLSX_PATH}`)
  console.log(`   db:   ${DB_PATH}`)

  ensureDir(DB_DIR)

  // DB 초기화
  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  const schema = readFileSync(SCHEMA_PATH, 'utf-8')
  db.exec(schema)

  // xlsx 읽기
  const workbook = XLSX.readFile(XLSX_PATH, { cellDates: true })

  // ── 1) ★인바운드 → partners (inbound) ──
  console.log('\n── ★인바운드 시트 처리 ──')
  const inboundSheet = workbook.Sheets['★인바운드']
  if (!inboundSheet) throw new Error('★인바운드 시트를 찾을 수 없습니다')

  const inboundRows: unknown[][] = XLSX.utils.sheet_to_json(inboundSheet, { header: 1, defval: null })

  const insertPartner = db.prepare(`
    INSERT OR IGNORE INTO partners (
      id, contract_type, pipeline_stage, status,
      apply_date, company_name, applicant_name, email, phone,
      phone_validation_result, business_type, business_number,
      experience_years, rider_count, currently_operating, platform_experience,
      has_office, operating_region, desired_region_text, comment,
      doc_review_result, drop_reason, proposal_sent, proposal_date,
      assigned_team, call_status, call_result, lms_sent, contract_progress,
      created_at, updated_at
    ) VALUES (
      ?, 'direct', ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?
    )
  `)

  let inboundCount = 0
  let inboundSkipped = 0

  const insertMany = db.transaction(() => {
    for (let i = 1; i < inboundRows.length; i++) {
      const r = inboundRows[i]!
      if (!r[1] && !r[2]) { inboundSkipped++; continue } // 신청일도 상호명도 없으면 스킵

      const companyName = normalizeStr(r[2])
      if (!companyName) { inboundSkipped++; continue }

      const parsed = inferInboundStatus({
        docReviewResult: normalizeStr(r[19]),
        proposalSent: normalizeStr(r[21]),
        dropReason: normalizeStr(r[20]),
        callResult: normalizeStr(r[26]),
        contractProgress: normalizeStr(r[31]),
        phoneValidation: normalizeStr(r[7]),
      })

      const id = randomUUID()
      const applyDate = normalizeDate(r[1])

      insertPartner.run(
        id, parsed.stage, parsed.status,
        applyDate, companyName,
        normalizeStr(r[3]) || normalizeStr(r[4]),  // 이름 or 지원자명
        normalizeStr(r[5]),  // 이메일
        normalizePhone(r[6]),  // 대표번호
        normalizeStr(r[7]),  // 유효성검사
        normalizeStr(r[8]),  // 사업자등록 형태
        normalizeStr(r[9]),  // 사업자등록번호
        normalizeStr(r[10]), // 경력
        normalizeStr(r[11]), // 라이더 인원수
        normalizeStr(r[12]), // 현재 운행 여부
        normalizeStr(r[13]), // 플랫폼경험
        normalizeStr(r[14]), // 사무실 보유
        normalizeStr(r[15]), // 운행지역
        normalizeStr(r[16]), // 희망지역
        normalizeStr(r[17]), // 하고싶은말
        normalizeStr(r[19]), // 서류 검토 결과
        normalizeStr(r[20]), // 드랍사유
        normalizeStr(r[21]), // 제안서/서류 발송
        normalizeDate(r[25]), // 발송날짜
        normalizeStr(r[22]), // 담당팀
        normalizeStr(r[24]), // 통화 여부
        normalizeStr(r[26]), // 유선 상담 결과
        normalizeStr(r[27]), // LMS 발송 여부
        normalizeStr(r[31]), // 계약진행여부
        applyDate || new Date().toISOString(),
        new Date().toISOString(),
      )
      inboundCount++
    }
  })

  insertMany()
  console.log(`   ✅ 인바운드: ${inboundCount}건 삽입, ${inboundSkipped}건 스킵`)

  // ── 2) ★계약자 리스트 → partners (doc_review~operating) + contracts + bank_accounts ──
  console.log('\n── ★계약자 리스트 시트 처리 ──')
  const contractSheet = workbook.Sheets['★계약자 리스트']
  if (!contractSheet) throw new Error('★계약자 리스트 시트를 찾을 수 없습니다')

  const contractRows: unknown[][] = XLSX.utils.sheet_to_json(contractSheet, { header: 1, defval: null })

  const upsertPartnerFromContract = db.prepare(`
    UPDATE partners SET
      pipeline_stage = ?, status = ?,
      representative_name = COALESCE(?, representative_name),
      representative_phone = COALESCE(?, representative_phone),
      email = COALESCE(?, email),
      phone = COALESCE(?, phone),
      business_number = COALESCE(?, business_number),
      business_type = COALESCE(?, business_type),
      business_open_date = COALESCE(?, business_open_date),
      business_category = COALESCE(?, business_category),
      business_item = COALESCE(?, business_item),
      business_address = COALESCE(?, business_address),
      desired_region_text = COALESCE(?, desired_region_text),
      contract_template = ?,
      dp_code = ?,
      biz_id = ?,
      biz_member_name = ?,
      sap_code = ?,
      operating_start_date = ?,
      first_delivery_date = ?,
      drive_folder_link = ?,
      updated_at = ?
    WHERE business_number = ?
  `)

  const insertPartnerFromContract = db.prepare(`
    INSERT INTO partners (
      id, contract_type, pipeline_stage, status,
      apply_date, company_name, representative_name,
      email, phone, representative_phone,
      business_number, business_open_date, business_category, business_item, business_address,
      desired_region_text, contract_template,
      dp_code, biz_id, biz_member_name, sap_code,
      operating_start_date, first_delivery_date, drive_folder_link,
      created_at, updated_at
    ) VALUES (
      ?, 'direct', ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?
    )
  `)

  const insertContract = db.prepare(`
    INSERT INTO contracts (
      id, partner_id, template_type, signok_status,
      sent_date, signed_date, contract_start_date, contract_end_date,
      delivery_region
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertBank = db.prepare(`
    INSERT INTO bank_accounts (id, partner_id, bank_name, account_number, account_holder)
    VALUES (?, ?, ?, ?, ?)
  `)

  const findByBizNum = db.prepare(`SELECT id FROM partners WHERE business_number = ? LIMIT 1`)

  let contractCount = 0
  let contractUpdated = 0
  let contractInserted = 0
  let contractSkipped = 0

  const insertContracts = db.transaction(() => {
    for (let i = 2; i < contractRows.length; i++) {
      const r = contractRows[i]!
      const companyName = normalizeStr(r[3])
      if (!companyName) { contractSkipped++; continue }

      const bizNum = normalizeStr(r[11])
      const contractStatus = normalizeStr(r[30])
      const dpCode = normalizeStr(r[39])

      const parsed = inferPipelineStage({
        docReviewResult: null,
        proposalSent: null,
        contractProgress: null,
        dpCode,
        contractStatus,
      })

      const now = new Date().toISOString()

      // 인바운드에서 이미 삽입된 건이 있는지 사업자번호로 검색
      const existing = bizNum ? (findByBizNum.get(bizNum) as { id: string } | undefined) : undefined

      let partnerId: string

      if (existing) {
        // 기존 레코드 업데이트
        partnerId = existing.id
        upsertPartnerFromContract.run(
          parsed.stage, parsed.status,
          normalizeStr(r[18]),  // 대표자명
          normalizePhone(r[20]), // 대표자번호
          normalizeStr(r[6]),   // 이메일
          normalizePhone(r[7]), // 연락처
          bizNum,
          normalizeStr(r[12]),  // 사업자형태
          normalizeDate(r[14]), // 개업연월일
          normalizeStr(r[15]),  // 업태
          normalizeStr(r[16]),  // 종목
          normalizeStr(r[17]),  // 사업장소재지
          normalizeStr(r[4]),   // 최초 배달지역
          normalizeStr(r[29]),  // 계약템플릿
          dpCode,
          normalizeStr(r[35]),  // 비즈아이디
          normalizeStr(r[36]),  // 가입자명
          normalizeStr(r[38]) ? String(r[38]).replace(/\.0$/, '') : null, // 구매처코드
          normalizeDate(r[5]),  // 운영 시작일
          normalizeDate(r[34]), // 첫 운행시작일
          normalizeStr(r[43]),  // 드라이브링크
          now,
          bizNum,
        )
        contractUpdated++
      } else {
        // 신규 삽입
        partnerId = randomUUID()
        insertPartnerFromContract.run(
          partnerId, parsed.stage, parsed.status,
          normalizeDate(r[0]),   // 지원일
          companyName,
          normalizeStr(r[18]),   // 대표자명
          normalizeStr(r[6]),    // 이메일
          normalizePhone(r[7]),  // 연락처
          normalizePhone(r[20]), // 대표자번호
          bizNum,
          normalizeDate(r[14]),  // 개업연월일
          normalizeStr(r[15]),   // 업태
          normalizeStr(r[16]),   // 종목
          normalizeStr(r[17]),   // 사업장소재지
          normalizeStr(r[4]),    // 최초 배달지역
          normalizeStr(r[29]),   // 계약템플릿
          dpCode,
          normalizeStr(r[35]),   // 비즈아이디
          normalizeStr(r[36]),   // 가입자명
          normalizeStr(r[38]) ? String(r[38]).replace(/\.0$/, '') : null,
          normalizeDate(r[5]),   // 운영 시작일
          normalizeDate(r[34]),  // 첫 운행시작일
          normalizeStr(r[43]),   // 드라이브링크
          normalizeDate(r[0]) || now,
          now,
        )
        contractInserted++
      }

      // 계약 정보 삽입
      if (normalizeStr(r[26]) || contractStatus) {
        insertContract.run(
          randomUUID(), partnerId,
          normalizeStr(r[29]),   // 계약템플릿
          contractStatus,        // 계약체결 여부
          normalizeDate(r[26]),  // 계약서 발송일
          normalizeDate(r[31]),  // 계약체결일
          normalizeDate(r[44]),  // 계약 시작일
          normalizeDate(r[45]),  // 계약 종료일
          normalizeStr(r[4]),    // 배달지역
        )
      }

      // 계좌 정보 삽입
      const bankName = normalizeStr(r[21])
      const accountNum = normalizeStr(r[22])
      if (bankName && accountNum) {
        insertBank.run(
          randomUUID(), partnerId,
          bankName, accountNum, normalizeStr(r[23])
        )
      }

      contractCount++
    }
  })

  insertContracts()
  console.log(`   ✅ 계약자: ${contractCount}건 처리 (업데이트 ${contractUpdated}, 신규 ${contractInserted}, 스킵 ${contractSkipped})`)

  // ── 집계 ──
  const totalPartners = (db.prepare('SELECT COUNT(*) as c FROM partners').get() as { c: number }).c
  const totalContracts = (db.prepare('SELECT COUNT(*) as c FROM contracts').get() as { c: number }).c
  const totalBanks = (db.prepare('SELECT COUNT(*) as c FROM bank_accounts').get() as { c: number }).c

  const stageCounts = db.prepare(`
    SELECT pipeline_stage, COUNT(*) as c FROM partners GROUP BY pipeline_stage ORDER BY c DESC
  `).all() as { pipeline_stage: string; c: number }[]

  console.log('\n── 마이그레이션 완료 ──')
  console.log(`   partners:      ${totalPartners}건`)
  console.log(`   contracts:     ${totalContracts}건`)
  console.log(`   bank_accounts: ${totalBanks}건`)
  console.log('\n   파이프라인 단계별:')
  for (const s of stageCounts) {
    console.log(`     ${s.pipeline_stage}: ${s.c}건`)
  }

  db.close()
  console.log('\n✅ 마이그레이션 완료!')
}

main()
