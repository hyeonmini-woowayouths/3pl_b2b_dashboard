import { useState } from 'react'
import { X } from 'lucide-react'

const API_BASE = '/api'

interface Props {
  onClose: () => void
  onCreated: () => void
}

export function NewPartnerModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    company_name: '',
    applicant_name: '',
    email: '',
    phone: '',
    business_type: '',
    business_number: '',
    desired_region_text: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/partners/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, terms_agreed: true }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) {
        setError(data.error ?? '등록 실패')
        return
      }
      onCreated()
      onClose()
    } catch {
      setError('서버 연결 실패')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[560px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">신규 인바운드 등록</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">상호명 *</label>
              <input type="text" value={form.company_name} onChange={(e) => set('company_name', e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">지원자명 *</label>
              <input type="text" value={form.applicant_name} onChange={(e) => set('applicant_name', e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">이메일 *</label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">연락처</label>
              <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">사업자 형태</label>
              <select value={form.business_type} onChange={(e) => set('business_type', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="">선택</option>
                <option value="일반과세">일반과세</option>
                <option value="법인">법인</option>
                <option value="간이과세">간이과세</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">사업자등록번호</label>
              <input type="text" value={form.business_number} onChange={(e) => set('business_number', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">희망 배달 지역</label>
            <input type="text" value={form.desired_region_text} onChange={(e) => set('desired_region_text', e.target.value)}
              placeholder="예: 서울시 강남구"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100">
              취소
            </button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
              {submitting ? '등록 중...' : '인바운드 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
