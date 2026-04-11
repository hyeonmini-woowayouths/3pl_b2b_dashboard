import { useState } from 'react'
import { Layers, CheckCircle, AlertTriangle } from 'lucide-react'

const API_BASE = 'http://localhost:3001/api'

const BUSINESS_TYPES = ['일반과세', '법인', '간이과세', '면세']
const EXPERIENCE_OPTIONS = ['없음', '6개월 미만', '6개월~1년', '1년 이상']
const RIDER_COUNT_OPTIONS = ['5명 미만', '5명~10명 미만', '10명~20명 미만', '20명 이상']

interface FormData {
  company_name: string
  applicant_name: string
  email: string
  phone: string
  business_type: string
  business_number: string
  desired_region_text: string
  experience_years: string
  rider_count: string
  platform_experience: string
  comment: string
  terms_agreed: boolean
}

const INITIAL: FormData = {
  company_name: '', applicant_name: '', email: '', phone: '',
  business_type: '', business_number: '', desired_region_text: '',
  experience_years: '', rider_count: '', platform_experience: '',
  comment: '', terms_agreed: false,
}

export function ApplyPage() {
  const [form, setForm] = useState<FormData>(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const set = (field: keyof FormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setResult(null)

    try {
      const res = await fetch(`${API_BASE}/partners/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json() as { ok?: boolean; message?: string; error?: string }
      if (res.ok) {
        setResult({ ok: true, message: data.message ?? '신청이 접수되었습니다.' })
        setForm(INITIAL)
      } else {
        setResult({ ok: false, message: data.error ?? '오류가 발생했습니다.' })
      }
    } catch {
      setResult({ ok: false, message: '서버에 연결할 수 없습니다.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Layers className="text-blue-600" size={28} />
          <div>
            <h1 className="text-lg font-bold text-gray-900">배민커넥트비즈 협력사 신청</h1>
            <p className="text-xs text-gray-500">3PL 직계약 협력사 온보딩 신청서</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto py-8 px-6">
        {result && (
          <div className={`mb-6 px-5 py-4 rounded-xl flex items-start gap-3 ${
            result.ok ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
          }`}>
            {result.ok ? <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={20} /> : <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />}
            <div>
              <p className={`text-sm font-medium ${result.ok ? 'text-emerald-800' : 'text-red-800'}`}>{result.message}</p>
              {result.ok && <p className="text-xs text-emerald-600 mt-1">담당자 검토 후 이메일로 제안서를 안내드립니다.</p>}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* 사업자 정보 */}
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 mb-4">사업자 정보</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="상호명" required value={form.company_name} onChange={(v) => set('company_name', v)} placeholder="예: 가나다물류" />
              <Field label="대표자/지원자명" required value={form.applicant_name} onChange={(v) => set('applicant_name', v)} />
              <Field label="이메일" required type="email" value={form.email} onChange={(v) => set('email', v)} placeholder="example@email.com" />
              <Field label="연락처" required type="tel" value={form.phone} onChange={(v) => set('phone', v)} placeholder="010-0000-0000" />
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">사업자 형태 <span className="text-red-500">*</span></label>
                <select value={form.business_type} onChange={(e) => set('business_type', e.target.value)} required
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">선택하세요</option>
                  {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {form.business_type === '간이과세' && (
                  <p className="text-xs text-red-500 mt-1">간이과세자는 신청할 수 없습니다.</p>
                )}
              </div>
              <Field label="사업자등록번호" required value={form.business_number} onChange={(v) => set('business_number', v)} placeholder="000-00-00000" />
            </div>
          </div>

          {/* 운영 정보 */}
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 mb-4">운영 정보</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="희망 배달 지역" required value={form.desired_region_text} onChange={(v) => set('desired_region_text', v)} placeholder="예: 서울시 강남구" />
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">배달 경력</label>
                <select value={form.experience_years} onChange={(e) => set('experience_years', e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">선택하세요</option>
                  {EXPERIENCE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">라이더 인원수</label>
                <select value={form.rider_count} onChange={(e) => set('rider_count', e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">선택하세요</option>
                  {RIDER_COUNT_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <Field label="타 플랫폼 경험" value={form.platform_experience} onChange={(v) => set('platform_experience', v)} placeholder="예: 바로고, 생각대로" />
            </div>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1">하고 싶은 말 (선택)</label>
              <textarea value={form.comment} onChange={(e) => set('comment', e.target.value)}
                rows={3} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="추가 안내 사항이 있으시면 자유롭게 작성해 주세요." />
            </div>
          </div>

          {/* 약관 + 제출 */}
          <div className="px-6 py-5 bg-gray-50">
            <label className="flex items-start gap-3 cursor-pointer mb-5">
              <input type="checkbox" checked={form.terms_agreed} onChange={(e) => set('terms_agreed', e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-xs text-gray-600 leading-relaxed">
                개인정보 수집 및 이용에 동의합니다. 수집된 정보는 협력사 계약 검토 목적으로만 활용되며,
                계약 미체결 시 30일 이내 파기됩니다. <span className="text-red-500">*필수</span>
              </span>
            </label>
            <button type="submit" disabled={submitting || !form.terms_agreed || form.business_type === '간이과세'}
              className="w-full py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {submitting ? '접수 중...' : '협력사 신청서 제출'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

function Field({ label, value, onChange, required, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder}
        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
    </div>
  )
}
