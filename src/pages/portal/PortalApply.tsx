import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { PortalLayout } from './PortalLayout'
import { portalApi } from '../../lib/portal-api'

const BIZ_TYPES = [
  { value: '일반과세', label: '일반과세 사업자', allowed: true },
  { value: '법인', label: '법인사업자', allowed: true },
  { value: '간이과세', label: '간이과세 사업자', allowed: false, note: '가입 불가' },
  { value: '면세', label: '면세사업자', allowed: true },
]

export function PortalApply() {
  const nav = useNavigate()
  const loc = useLocation()
  const prefilledBiz = (loc.state as { bizNum?: string })?.bizNum ?? ''
  const prefilledPhone = (loc.state as { phone?: string })?.phone ?? ''

  const [form, setForm] = useState({
    applicant_name: '',
    phone: prefilledPhone,
    business_number: prefilledBiz,
    business_type: '',
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

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const isSimIgwa = form.business_type === '간이과세'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSimIgwa) return
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
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">사업자등록번호 <span className="text-red-500">*</span></label>
            <input type="text" value={form.business_number} onChange={(e) => set('business_number', e.target.value)} required placeholder="000-00-00000"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:bg-white" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">사업자 형태 <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {BIZ_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set('business_type', t.value)}
                  className={`px-3 py-2.5 text-sm rounded-lg border transition-colors ${
                    form.business_type === t.value
                      ? t.allowed ? 'bg-emerald-50 border-emerald-400 text-emerald-700 font-semibold' : 'bg-red-50 border-red-400 text-red-700 font-semibold'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t.label}
                  {t.note && <span className="block text-[10px] mt-0.5">{t.note}</span>}
                </button>
              ))}
            </div>
            {isSimIgwa && (
              <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                간이과세자는 협력사 가입이 불가능합니다. 일반과세 또는 법인사업자로 전환 후 신청해주세요.
              </div>
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

          <button type="submit" disabled={loading || !terms || isSimIgwa || !form.business_type}
            className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors">
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
