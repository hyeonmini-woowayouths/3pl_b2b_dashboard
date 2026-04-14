import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle, Shield, Loader2, Info } from 'lucide-react'
import { PortalLayout } from './PortalLayout'
import { portalApi } from '../../lib/portal-api'
import type { NtsVerifyResult, EnrichedZone } from '../../lib/portal-api'
import { formatBizNum, formatPhone } from '../../lib/format'
import { ZoneSelector } from '../../components/portal/ZoneSelector'

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
  const [zone1, setZone1] = useState<EnrichedZone | null>(null)
  const [zone2, setZone2] = useState<EnrichedZone | null>(null)
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {/* ① 사업자 본인 확인 */}
          <section className="space-y-3">
            <SectionHeader icon={<Shield size={12} />} title="사업자 본인 확인" />

            <Field label="대표자명" required>
              <TextInput value={form.representative_name} onChange={(v) => { set('representative_name', v); setVerification(null) }}
                placeholder="사업자등록증상의 대표자 이름" />
            </Field>

            <Field label="상호명" required>
              <TextInput value={form.company_name} onChange={(v) => { set('company_name', v); setVerification(null) }}
                placeholder="사업자등록증상의 상호명" />
            </Field>

            <Field label="사업자등록번호" required>
              <div className="flex gap-2">
                <TextInput value={form.business_number} inputMode="numeric"
                  onChange={(v) => { set('business_number', formatBizNum(v)); setVerification(null) }}
                  placeholder="000-00-00000" />
                <button type="button" onClick={handleVerify}
                  disabled={verifying || !form.business_number.trim() || !form.representative_name.trim()}
                  className="shrink-0 px-4 py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 flex items-center gap-1.5">
                  {verifying ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                  {verifying ? '조회 중' : '국세청 조회'}
                </button>
              </div>
            </Field>

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
              <div className="text-[11px] text-amber-600">
                <AlertCircle size={11} className="inline mr-0.5" />
                정보가 변경되어 재조회가 필요합니다
              </div>
            )}
          </section>

          {/* 구분선 */}
          <div className="border-t border-gray-100" />

          {/* ② 연락처 */}
          <section className="space-y-3">
            <SectionHeader title="연락처" />
            <Field label="휴대폰 번호" required>
              <TextInput type="tel" inputMode="numeric" value={form.phone}
                onChange={(v) => set('phone', formatPhone(v))} placeholder="010-0000-0000" />
            </Field>
            <Field label="이메일" required>
              <TextInput type="email" value={form.email} onChange={(v) => set('email', v)} placeholder="name@example.com" />
            </Field>
          </section>

          <div className="border-t border-gray-100" />

          {/* ③ 희망 권역 */}
          <section className="space-y-3">
            <SectionHeader title="희망 배달 권역" hint="1지망은 필수, 2지망은 선택" required />
            <ZoneSelector label="1지망 (필수)" value={zone1} onChange={setZone1} required />
            <ZoneSelector label="2지망 (선택)" value={zone2} onChange={setZone2} excludeId={zone1?.id} />
            <p className="text-[11px] text-gray-500 leading-relaxed flex items-start gap-1.5 pt-1">
              <Info size={11} className="shrink-0 mt-0.5 text-gray-400" />
              <span>신청 접수 후에도 담당자 검토·협의를 통해 권역 조정이 가능합니다. 우선 가장 가까운 후보를 선택해주세요.</span>
            </p>
          </section>

          <div className="border-t border-gray-100" />

          {/* ④ 운영 정보 */}
          <section className="space-y-3">
            <SectionHeader title="운영 정보" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="배달 경력">
                <Select value={form.experience_years} onChange={(v) => set('experience_years', v)}
                  options={['없음', '6개월 미만', '6개월~1년', '1년 이상']} />
              </Field>
              <Field label="라이더 인원">
                <Select value={form.rider_count} onChange={(v) => set('rider_count', v)}
                  options={['5명 미만', '5명~10명 미만', '10명~20명 미만', '20명 이상']} />
              </Field>
            </div>
          </section>

          {/* 하단: 약관 + 제출 */}
          <div className="pt-2 space-y-3">
            <label className="flex items-start gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
              <span className="text-xs text-gray-700 leading-relaxed">
                개인정보 수집 및 이용에 동의합니다. <span className="text-red-500 font-semibold">*필수</span>
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
              className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {loading ? '접수 중...' : '신청서 제출'}
            </button>

            <button type="button" onClick={() => nav('/portal')}
              className="w-full text-xs text-gray-500 hover:text-gray-700">
              ← 포털 홈으로
            </button>
          </div>
        </form>
      </div>
    </PortalLayout>
  )
}

// ── 공통 UI 컴포넌트 ──────────────

function SectionHeader({ icon, title, hint, required }: { icon?: React.ReactNode; title: string; hint?: string; required?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
        {icon && <span className="text-gray-500">{icon}</span>}
        {title}
        {required && <span className="text-red-500 text-xs">*</span>}
      </div>
      {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const INPUT_CLASS = 'w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-colors'

function TextInput({ value, onChange, placeholder, type = 'text', inputMode }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
  inputMode?: 'text' | 'numeric' | 'tel' | 'email'
}) {
  return (
    <input type={type} inputMode={inputMode} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} className={INPUT_CLASS} />
  )
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={INPUT_CLASS}>
      <option value="">선택</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}
