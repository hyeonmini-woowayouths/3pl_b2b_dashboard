/**
 * 사업자등록번호 포맷팅 — 숫자만 입력받아 000-00-00000 형태로 변환
 */
export function formatBizNum(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
}

/**
 * 휴대폰 번호 포맷팅 — 010-0000-0000 또는 02-000-0000
 */
export function formatPhone(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 11)
  if (digits.startsWith('02')) {
    // 서울
    if (digits.length <= 2) return digits
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  // 휴대폰 또는 지역번호 3자리
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}
