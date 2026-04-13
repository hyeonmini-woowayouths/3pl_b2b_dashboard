import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle, Shield, Loader2, Search, MapPin, X } from 'lucide-react'
import { PortalLayout } from './PortalLayout'
import { portalApi } from '../../lib/portal-api'
import type { NtsVerifyResult } from '../../lib/portal-api'
import { formatBizNum, formatPhone } from '../../lib/format'

interface ZoneSuggestion {
  id: string
  zone_code: string
  rgn1: string
  rgn2: string
  region_class: string
  pricing_plan: string | null
  set_tracker_available: boolean
}

export function PortalApply() {
  const nav = useNavigate()
  const loc = useLocation()
  const prefilledBiz = (loc.state as { bizNum?: string })?.bizNum ?? ''
  const prefilledPhone = (loc.state as { phone?: string })?.phone ?? ''

  const [form, setForm] = useState({
    representative_name: '',
    phone: prefilledPhone,
    business_number: prefilledBiz,
    company_name: '',
    email: '',
    experience_years: '',
    rider_count: '',
  })
  const [zone1, setZone1] = useState<ZoneSuggestion | null>(null)
  const [zone2, setZone2] = useState<ZoneSuggestion | null>(null)
  const [terms, setTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ ok: boolean; partnerId?: string } | null>(null)
  const [loading, setLoading] = useState(false)

  // 국세청 검증 상태
  const [verifying, setVerifying] = useState(false)
  const [verification, setVerification] = useState<NtsVerifyResult | null>(null)
  const [verifiedSnapshot, setVerifiedSnapshot] = useState<string>('')

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const currentSnapshot = `${form.business_number.trim()}|${form.representative_name.trim()}|${form.company_name.trim()}`
  const verifiedMatch = verifiedSnapshot === currentSnapshot

  const handleVerify = async () => {
    const biz = form.business_number.trim()
    const name = form.representative_name.trim()
    if (!biz || !name) {
      setError('사업자번호와 대표자명을 먼저 입력해주세요')
      return
    }
    setError(null)
    setVerifying(true)
    setVerification(null)
    try {
      const r = await portalApi.verifyBizNum(biz, name, form.company_name.trim() || undefined)
      setVerification(r)
      setVerifiedSnapshot(currentSnapshot)
    } catch (e) {
      setError(e instanceof Error ? e.message : '검증 실패')
    } finally {
      setVerifying(false)
    }
  }

  const statusOk = verification?.success && verification.isActive && verification.formal !== '간이과세' && verification.formal !== '기타'
  const identityOk = !verification?.identity || verification.identity.valid
  const canSubmit = Boolean(statusOk && identityOk && verifiedMatch && zone1 && form.phone && form.email)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    setLoading(true)
    try {
      const r = await portalApi.apply({
        applicant_name: form.representative_name,
        representative_name: form.representative_name,
        phone: form.phone,
        business_number: form.business_number,
        company_name: form.company_name,
        email: form.email,
        desired_zone_1_id: zone1?.id,
        desired_zone_2_id: zone2?.id,
        experience_years: form.experience_years,
        rider_count: form.rider_count,
      })
      setResult({ ok: true, partnerId: r.id })
    } catch (e) {
      setError(e instanceof Error ? e.message : '신청 실패')
    } finally {
      setLoading(false)
    }
  }

  if (result?.ok) {
    return (
      <PortalLayout>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
          <CheckCircle className="mx-auto text-emerald-500 mb-3" size={44} />
          <h2 className="text-lg font-bold text-gray-900 mb-2">신청 접수 완료</h2>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            담당자 검토 후 {form.phone}로<br/>
            알림톡과 이메일로 안내드립니다.<br/>
            <span className="text-xs text-gray-400">(보통 2영업일 이내)</span>
          </p>
          <button onClick={() => nav('/portal')} className="w-full py-2.5 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 text-sm">
            포털 홈으로
          </button>
        </div>
      </PortalLayout>
    )
  }

  return (
    <PortalLayout>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900">신규 협력사 신청</h1>
          <p className="text-xs text-gray-500 mt-0.5">국세청 사업자등록 확인을 통해 본인 여부가 검증됩니다</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {/* 사업자 확인 섹션 */}
          <section className="bg-gray-50 -mx-6 px-6 py-4 border-y border-gray-100">
            <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-1">
              <Shield size={11} /> 사업자 본인 확인
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">대표자명 <span className="text-red-500">*</span></label>
                <input type="text" value={form.representative_name} onChange={(e) => { set('representative_name', e.target.value); setVerification(null) }} required
                  placeholder="사업자등록증상의 대표자 이름"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">상호명 <span className="text-red-500">*</span></label>
                <input type="text" value={form.company_name} onChange={(e) => { set('company_name', e.target.value); setVerification(null) }} required
                  placeholder="사업자등록증상의 상호명"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">사업자등록번호 <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <input type="text" inputMode="numeric" value={form.business_number} onChange={(e) => { set('business_number', formatBizNum(e.target.value)); setVerification(null) }} required placeholder="000-00-00000"
                    className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                  <button type="button" onClick={handleVerify} disabled={verifying || !form.business_number.trim() || !form.representative_name.trim()}
                    className="px-4 py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 flex items-center gap-1.5">
                    {verifying ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                    {verifying ? '조회 중' : '국세청 조회'}
                  </button>
                </div>
              </div>

              {/* 검증 결과 */}
              {verification && (
                <div className={`rounded-lg border p-3 ${
                  statusOk && identityOk ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-red-50 border-red-300'
                }`}>
                  {statusOk && identityOk ? (
                    <div className="space-y-1.5 text-xs text-emerald-800">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                        <CheckCircle size={14} /> 국세청 확인 완료
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                        <div>사업자 형태: <strong>{verification.formal}</strong></div>
                        <div>사업자 상태: <strong>계속사업자</strong></div>
                        {verification.taxType && <div className="col-span-2">과세유형: {verification.taxType}</div>}
                        {verification.identity && (
                          <div className="col-span-2 pt-1 mt-1 border-t border-emerald-200">
                            <CheckCircle size={10} className="inline mr-0.5" /> {verification.identity.message}
                          </div>
                        )}
                        <div className="col-span-2 text-[10px] text-emerald-600">
                          출처: {verification.source === 'nts_api' ? '국세청 API' : '로컬 패턴 추정 (API 키 미설정)'}
                        </div>
                      </div>
                    </div>
                  ) : verification.formal === '간이과세' ? (
                    <div className="flex items-start gap-1.5 text-xs text-red-700">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">간이과세자는 협력사 가입 불가</div>
                        <div className="text-[11px] mt-0.5">일반과세 또는 법인사업자로 전환 후 신청해주세요.</div>
                      </div>
                    </div>
                  ) : verification.identity && !verification.identity.valid ? (
                    <div className="flex items-start gap-1.5 text-xs text-red-700">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">본인 확인 실패</div>
                        <div className="text-[11px] mt-0.5">{verification.identity.message}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-1.5 text-xs text-red-700">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span>{verification.error ?? '사업자 등록 확인 실패'}</span>
                    </div>
                  )}
                </div>
              )}

              {verification && !verifiedMatch && (
                <div className="text-[11px] text-amber-600 px-1">
                  <AlertCircle size={11} className="inline mr-0.5" />
                  정보가 변경되어 재조회가 필요합니다
                </div>
              )}
            </div>
          </section>

          {/* 연락처 */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">휴대폰 번호 <span className="text-red-500">*</span></label>
            <input type="tel" inputMode="numeric" value={form.phone} onChange={(e) => set('phone', formatPhone(e.target.value))} required placeholder="010-0000-0000"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:bg-white" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">이메일 <span className="text-red-500">*</span></label>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:bg-white" />
          </div>

          {/* 희망 권역 */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              희망 배달 권역 <span className="text-red-500">*</span>
              <span className="ml-1 text-[10px] font-normal text-gray-400">1지망은 필수, 2지망은 선택</span>
            </label>
            <div className="space-y-2">
              <ZonePicker label="1지망 (필수)" value={zone1} onChange={setZone1} required />
              <ZonePicker label="2지망 (선택)" value={zone2} onChange={setZone2} excludeId={zone1?.id} />
            </div>
          </div>

          {/* 경력 정보 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">배달 경력</label>
              <select value={form.experience_years} onChange={(e) => set('experience_years', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                <option value="">선택</option>
                <option value="없음">없음</option>
                <option value="6개월 미만">6개월 미만</option>
                <option value="6개월~1년">6개월~1년</option>
                <option value="1년 이상">1년 이상</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">라이더 인원</label>
              <select value={form.rider_count} onChange={(e) => set('rider_count', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                <option value="">선택</option>
                <option value="5명 미만">5명 미만</option>
                <option value="5명~10명 미만">5명~10명 미만</option>
                <option value="10명~20명 미만">10명~20명 미만</option>
                <option value="20명 이상">20명 이상</option>
              </select>
            </div>
          </div>

          <label className="flex items-start gap-2 mt-2 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
            <span className="text-xs text-gray-600 leading-relaxed">
              개인정보 수집 및 이용에 동의합니다. <span className="text-red-500">*필수</span>
            </span>
          </label>

          {!canSubmit && (
            <p className="text-[11px] text-amber-600 text-center">
              {!verification ? '사업자 국세청 조회가 완료되어야 합니다'
                : !statusOk ? '간이과세/폐업 사업자는 신청 불가합니다'
                : !identityOk ? '본인 확인 실패 — 대표자명을 확인해주세요'
                : !verifiedMatch ? '정보가 변경되어 재조회가 필요합니다'
                : !zone1 ? '희망 배달 권역(1지망)을 선택해주세요'
                : !form.phone || !form.email ? '휴대폰과 이메일을 입력해주세요'
                : '필수 항목을 확인해주세요'}
            </p>
          )}
          <button type="submit" disabled={loading || !terms || !canSubmit}
            className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {loading ? '접수 중...' : '신청서 제출'}
          </button>

          <button type="button" onClick={() => nav('/portal')}
            className="w-full text-xs text-gray-500 hover:text-gray-700">
            ← 포털 홈으로
          </button>
        </form>
      </div>
    </PortalLayout>
  )
}

// ── 권역 검색 + 선택 컴포넌트 ──────────────
function ZonePicker({ label, value, onChange, required, excludeId }: {
  label: string; value: ZoneSuggestion | null; onChange: (z: ZoneSuggestion | null) => void
  required?: boolean; excludeId?: string
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<ZoneSuggestion[]>([])
  const [searching, setSearching] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!q || q.length < 1) { setResults([]); return }
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await portalApi.searchZones(q)
        setResults(r.suggestions.filter(s => s.id !== excludeId).slice(0, 10))
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [q, excludeId])

  if (value) {
    return (
      <div className="flex items-center justify-between px-3 py-2.5 bg-emerald-50 border border-emerald-300 rounded-lg">
        <div className="text-sm">
          <div className="font-bold text-emerald-900">{value.zone_code}</div>
          <div className="text-[11px] text-emerald-700">
            {value.rgn1} {value.rgn2} · {value.region_class} · {value.pricing_plan ?? '기본'} 요금제
            {!value.set_tracker_available && <span className="ml-1 text-red-600 font-bold">⚠ Set Cap</span>}
          </div>
        </div>
        <button type="button" onClick={() => { onChange(null); setQ('') }}
          className="p-1 hover:bg-emerald-100 rounded">
          <X size={14} className="text-emerald-700" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={`${label} · 예) 강남, 부천, 용인기흥`}
          required={required && !value}
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:bg-white"
        />
      </div>
      {open && q && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {searching && (
              <div className="px-3 py-2 text-xs text-gray-400 text-center"><Loader2 size={12} className="inline animate-spin mr-1" /> 검색 중...</div>
            )}
            {!searching && results.length === 0 && (
              <div className="px-3 py-3 text-xs text-gray-400 text-center">검색 결과가 없습니다</div>
            )}
            {!searching && results.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => { onChange(r); setOpen(false); setQ('') }}
                className="w-full text-left px-3 py-2 hover:bg-emerald-50 border-b border-gray-100 last:border-0 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                    <MapPin size={11} className="text-emerald-500" />
                    {r.zone_code}
                  </div>
                  <div className="text-[11px] text-gray-500">{r.rgn1} {r.rgn2} · {r.region_class}</div>
                </div>
                <div className="text-[10px] text-gray-500">
                  {r.pricing_plan}
                  {!r.set_tracker_available && <div className="text-red-500 font-bold">⚠ Cap</div>}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
