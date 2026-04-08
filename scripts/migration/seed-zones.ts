/**
 * 권역 마스터 데이터 시딩
 * 출처: ★협력사리스트 시트 + 도메인 온톨로지(지역구분 매핑)
 *
 * 실행: npm run db:seed-zones
 */

import XLSX from 'xlsx'
import Database from 'better-sqlite3'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..', '..')
const XLSX_PATH = join(PROJECT_ROOT, '..', '3pl', 'docs', 'sources', 'sheets', '협력사 지원 퍼널 관리 24`.xlsx')
const DB_PATH = join(PROJECT_ROOT, 'data', 'dashboard.db')
const SCHEMA_PATH = join(PROJECT_ROOT, 'src', 'db', 'schema.sql')

// 권역 코드에서 rgn1(시도), rgn2(시군구) 파싱
// 예: 표준서울강남A → { rgn1: '서울특별시', rgn2: '강남구' }
const RGN1_MAP: Record<string, string> = {
  '강원': '강원도', '경기': '경기도', '경남': '경상남도', '경북': '경상북도',
  '광주': '광주광역시', '대구': '대구광역시', '대전': '대전광역시',
  '부산': '부산광역시', '서울': '서울특별시', '세종': '세종특별자치시',
  '울산': '울산광역시', '인천': '인천광역시', '전남': '전라남도', '전북': '전라북도',
  '제주': '제주특별자치도', '충남': '충청남도', '충북': '충청북도',
}

// 지역구분 매핑 (도메인 온톨로지에서 추출)
// 키: zone_code → 값: '집중' | '관찰' | '안정'
const REGION_CLASS: Record<string, '집중' | '관찰' | '안정'> = {}

// 도메인 온톨로지 zone.md에서 지역구분 데이터 로드
function loadRegionClassFromOntology() {
  const zoneMdPath = join(PROJECT_ROOT, '..', '3pl', 'docs', 'domain', 'objects', 'zone.md')
  if (!existsSync(zoneMdPath)) {
    console.log('  ⚠️ zone.md not found, using default 관찰')
    return
  }

  const content = readFileSync(zoneMdPath, 'utf-8')
  // zone.md에 지역구분 테이블이 없으므로, 운영정책 위키에서 수집한 데이터를 하드코딩
  // 향후 자동 동기화 구현 시 여기를 API로 교체
}

// 운영정책 위키에서 수집한 지역구분 데이터 (260개 배민커넥트비즈 권역)
// 출처: [3PL]협력사 운영정책 한판 정리 > 등급제 > 권역별 보너스 관리비 테이블
function loadRegionClassFromXlsx(workbook: XLSX.WorkBook) {
  // ★ 직계약 보증보험 현황 시트에서 운영 여부 확인은 가능하나 지역구분은 없음
  // 대신 도메인 온톨로지에서 수집한 데이터를 매핑

  // 서울: 대부분 집중 (강북, 도봉, 성동A, 중랑 제외)
  const 서울집중 = ['강남', '강동', '강서', '관악', '광진', '구로', '금천', '노원', '동대문',
    '동작', '마포', '서대문', '서초', '성동B', '성북', '송파', '양천', '영등포', '용산',
    '은평', '종로', '중A', '중B']
  const 서울관찰 = ['강북', '도봉', '성동A', '중랑']

  // 경기: 집중 지역
  const 경기집중 = ['광주', '군포', '김포', '성남분당', '성남수정', '수원영통', '수원팔달',
    '안양동안', '안양만안', '용인기흥', '용인수지', '의왕', '하남', '화성']

  // 세종: 집중
  // 인천: 미추홀, 서, 연수, 중A = 집중
  const 인천집중 = ['미추홀', '서A', '서B', '연수', '중A']

  // 안정지역 (소규모/지방)
  const 안정키워드 = ['동해', '속초', '동두천', '양평', '여주', '포천', '안산단원',
    '거제', '사천', '통영', '김천', '안동', '서A', // 대구서, 부산서
    '동A', // 울산동
    '나주', '무안', '군산', '익산', '전주', '정읍', '서귀포',
    '공주', '논산', '보령', '홍성', '음성', '제천']

  return { 서울집중, 서울관찰, 경기집중, 인천집중, 안정키워드 }
}

function classifyZone(zoneCode: string, classData: ReturnType<typeof loadRegionClassFromXlsx>): '집중' | '관찰' | '안정' {
  const { 서울집중, 서울관찰, 경기집중, 인천집중, 안정키워드 } = classData

  // 서울
  if (zoneCode.startsWith('표준서울')) {
    const sub = zoneCode.replace('표준서울', '')
    if (서울집중.some(k => sub.startsWith(k))) return '집중'
    if (서울관찰.some(k => sub.startsWith(k))) return '관찰'
    return '집중' // 서울 기본값
  }

  // 세종
  if (zoneCode.startsWith('표준세종')) return '집중'

  // 경기
  if (zoneCode.startsWith('표준경기')) {
    const sub = zoneCode.replace('표준경기', '')
    if (경기집중.some(k => sub.startsWith(k))) return '집중'
    return '관찰'
  }

  // 인천
  if (zoneCode.startsWith('표준인천')) {
    const sub = zoneCode.replace('표준인천', '')
    if (인천집중.some(k => sub.startsWith(k))) return '집중'
    return '관찰'
  }

  // 안정지역 키워드 매칭
  if (안정키워드.some(k => zoneCode.includes(k))) return '안정'

  // 나머지 지방 = 관찰
  return '관찰'
}

function parseZoneCode(zoneCode: string): { rgn1: string; rgn2: string } {
  // 표준{지역}{시군구}{순번} 파싱
  const withoutPrefix = zoneCode.replace('표준', '')

  for (const [short, full] of Object.entries(RGN1_MAP)) {
    if (withoutPrefix.startsWith(short)) {
      const rest = withoutPrefix.slice(short.length)
      // 마지막 알파벳(A, B, C...) 제거
      const rgn2Part = rest.replace(/[A-Z]$/, '')
      return { rgn1: full, rgn2: rgn2Part || full }
    }
  }

  return { rgn1: '기타', rgn2: withoutPrefix }
}

// 요금제 매핑 (계약 지역 확인용 시트 기반)
function getPricingPlan(zoneCode: string): string | null {
  if (zoneCode.includes('서울')) {
    if (zoneCode.includes('서울A') || zoneCode.includes('강남') || zoneCode.includes('서초')) return '서울A'
    return '서울B'
  }
  if (zoneCode.includes('경기') || zoneCode.includes('인천')) return '경인B'
  if (zoneCode.includes('창원진해')) return '창원진해A'
  if (zoneCode.includes('경기과천')) return '경기과천A'
  return '지방'
}

function main() {
  console.log('🗺️  권역 마스터 데이터 시딩 시작...')

  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // schema 실행 (테이블 없을 경우 대비)
  const schema = readFileSync(SCHEMA_PATH, 'utf-8')
  db.exec(schema)

  const workbook = XLSX.readFile(XLSX_PATH, { cellDates: true })

  // 권역 코드 추출
  const sheet = workbook.Sheets['★ 협력사리스트']
  if (!sheet) throw new Error('★ 협력사리스트 시트를 찾을 수 없습니다')

  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })
  const zoneCodes = new Set<string>()
  for (let i = 1; i < rows.length; i++) {
    const code = rows[i]?.[3]
    if (code && String(code).trim().startsWith('표준')) {
      zoneCodes.add(String(code).trim())
    }
  }

  console.log(`   ${zoneCodes.size}개 고유 권역 발견`)

  const classData = loadRegionClassFromXlsx(workbook)

  const insert = db.prepare(`
    INSERT OR REPLACE INTO zones (id, zone_code, rgn1, rgn2, region_class, pricing_plan, set_tracker_available, is_open, platform, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, datetime('now'))
  `)

  const tx = db.transaction(() => {
    for (const code of zoneCodes) {
      const { rgn1, rgn2 } = parseZoneCode(code)
      const regionClass = classifyZone(code, classData)
      const plan = getPricingPlan(code)
      const platform = code.includes('로드러너') ? '로드러너' : '배민커넥트비즈'

      insert.run(randomUUID(), code, rgn1, rgn2, regionClass, plan, platform)
    }
  })

  tx()

  const total = (db.prepare('SELECT COUNT(*) as c FROM zones').get() as { c: number }).c
  const byClass = db.prepare('SELECT region_class, COUNT(*) as c FROM zones GROUP BY region_class').all() as { region_class: string; c: number }[]

  console.log(`\n   ✅ zones 테이블: ${total}건`)
  for (const r of byClass) {
    console.log(`     ${r.region_class}: ${r.c}개`)
  }

  db.close()
  console.log('\n✅ 권역 시딩 완료!')
}

main()
