import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle, Shield, Loader2 } from 'lucide-react'
import { PortalLayout } from './PortalLayout'
import { portalApi } from '../../lib/portal-api'
import type { NtsVerifyResult } from '../../lib/portal-api'

export function PortalApply() {
  const nav = useNavigate()
  const loc = useLocation()
  const prefilledBiz = (loc.state as { bizNum?: string })?.bizNum ?? ''
  const prefilledPhone = (loc.state as { phone?: string })?.phone ?? ''

  const [form, setForm] = useState({
    applicant_name: '',
    phone: prefilledPhone,
    business_number: prefilledBiz,
    company_name: '',
    email: '',
    desired_region_text: '',
    experience_years: '',
    rider_count: '',
  })
  const [terms, setTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ ok: boolean; partnerId?: string } | null>(null)
  const [loading, setLoading] = useState(false)

  // 국세청 검증 상태
  const [verifying, setVerifying] = useState(false)
  const [verification, setVerification] = useState<NtsVerifyResult | null>(null)
  const [lastVerifiedBiz, setLastVerifiedBiz] = useState('')

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleVerify = async () => {
    const biz = form.business_number.trim()
    if (!biz) return
    setError(null)
    setVerifying(true)
    setVerification(null)
    try {
      const r = await portalApi.verifyBizNum(biz)
      setVerification(r)
      setLastVerifiedBiz(biz)
    } catch (e) {
      setError(e instanceof Error ? e.message : '검증 실패')
    } finally {
      setVerifying(false)
    }
  }

  // 사업자번호가 변경되면 검증 초기화
  const handleBizChange = (v: string) => {
    set('business_number', v)
    if (v.trim() !== lastVerifiedBiz) setVerification(null)
  }

  const canSubmit = verification?.success && verification.isActive && verification.formal !== '간이과세' && verification.formal !== '기타' && form.business_number.trim() === lastVerifiedBiz
  const blocked = verification?.formal === '간이과세'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    setLoading(true)
    try {
      const r = await portalApi.apply(form)
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
          <div className="space-y-2">
            <button onClick={() => nav('/portal')} className="w-full py-2.5 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 text-sm">
              포털 홈으로
            </button>
          </div>
        </div>
      </PortalLayout>
    )
  }

  return (
    <PortalLayout>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900">신규 협력사 신청</h1>
          <p className="text-xs text-gray-500 mt-0.5">필수 정보를 입력해주세요</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">이름 <span className="text-red-500">*</span></label>
            <input type="text" value={form.applicant_name} onChange={(e) => set('applicant_name', e.target.value)} required
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:bg-white" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">휴대폰 번호 <span className="text-red-500">*</span></label>
            <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} required placeholder="010-0000-0000"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:bg-white" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              사업자등록번호 <span className="text-red-500">*</span>
              <span className="ml-1 text-[10px] font-normal text-gray-400">국세청 조회로 사업자 형태가 자동 판별됩니다</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.business_number}
                onChange={(e) => handleBizChange(e.target.value)}
                required
                placeholder="000-00-00000"
                className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:bg-white"
              />
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying || !form.business_number.trim()}
                className="px-4 py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 flex items-center gap-1.5"
              >
                {verifying ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                {verifying ? '조회 중' : '조회'}
              </button>
            </div>

            {/* 검증 결과 */}
            {verification && (
              <div className={`mt-2 rounded-lg border p-3 ${
                !verification.success || !verification.isActive || verification.formal === '기타' ? 'bg-red-50 border-red-200'
                  : verification.formal === '간이과세' ? 'bg-red-50 border-red-300'
                  : 'bg-emerald-50 border-emerald-200'
              }`}>
                {verification.success && verification.isActive && verification.formal !== '간이과세' && verification.formal !== '기타' ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                      <CheckCircle size={14} /> 사업자 등록 확인 완료
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-emerald-800">
                      <div>사업자 형태: <strong>{verification.formal}</strong></div>
                      <div>사업자 상태: <strong>{verification.isActive ? '계속사업자' : '휴/폐업'}</strong></div>
                      {verification.taxType && <div className="col-span-2">과세유형: {verification.taxType}</div>}
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
                ) : (
                  <div className="flex items-start gap-1.5 text-xs text-red-700">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{verification.error ?? '유효하지 않은 사업자번호입니다'}</span>
                  </div>
                )}
              </div>
            )}
            {!verification && !verifying && form.business_number && (
              <p className="mt-1.5 text-[11px] text-gray-500">사업자번호 입력 후 <strong>조회</strong> 버튼을 눌러주세요.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">상호명 <span className="text-red-500">*</span></label>
            <input type="text" value={form.company_name} onChange={(e) => set('company_name', e.target.value)} required
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:bg-white" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">이메일</label>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:bg-white" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">희망 배달 지역</label>
            <input type="text" value={form.desired_region_text} onChange={(e) => set('desired_region_text', e.target.value)} placeholder="예: 서울시 강남구"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:bg-white" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">배달 경력</label>
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
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">라이더 인원</label>
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
              개인정보 수집 및 이용에 동의합니다. 수집된 정보는 협력사 계약 검토 목적으로만 활용됩니다. <span className="text-red-500">*필수</span>
            </span>
          </label>

          {!canSubmit && !blocked && (
            <p className="text-[11px] text-amber-600 text-center">
              사업자번호 조회가 완료되어야 제출할 수 있습니다
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
