import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, CheckCircle, Clock, AlertTriangle, FileText } from 'lucide-react'
import { PortalLayout } from './PortalLayout'
import { portalApi } from '../../lib/portal-api'

const DOCS = [
  { key: 'business_cert', label: '사업자등록증', required: true, desc: '사업자등록번호와 상호명이 명확히 보이도록' },
  { key: 'bank_statement', label: '지급통장 사본', required: true, desc: '법인: 법인 통장 / 개인: 대표자 명의 통장' },
  { key: 'id_card', label: '대표자 신분증 사본', required: true, desc: '주민등록증 앞/뒷면 또는 운전면허증' },
  { key: 'biz_signup', label: '배민 비즈 회원가입 내역', required: false, desc: '회원가입 완료 페이지 캡쳐' },
  { key: 'unipost', label: '유니포스트 가입 내역', required: false, desc: '가입 완료 확인 페이지' },
  { key: 'tax_cert', label: '전자세금 공동인증서 발급내역', required: false, desc: '세금계산서 발행용' },
]

export function PortalDocuments() {
  const nav = useNavigate()
  const [docs, setDocs] = useState<Array<{ doc_type: string; status: string; rejection_reason: string | null; reviewed_at: string | null }>>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const load = () => {
    setLoading(true)
    portalApi.me().then(r => setDocs(r.documents)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleFile = async (docType: string, file: File) => {
    // MVP: 실제 업로드 대신 파일명만 등록 (n8n Drive 연동은 별도)
    setUploading(docType)
    try {
      const mockUrl = `https://drive.example.com/mock/${docType}/${Date.now()}_${file.name}`
      await portalApi.uploadDocument(docType, mockUrl, file.name)
      load()
    } finally {
      setUploading(null)
    }
  }

  if (loading) {
    return <PortalLayout showLogout><div className="text-center py-20 text-gray-400">불러오는 중...</div></PortalLayout>
  }

  return (
    <PortalLayout showLogout>
      <button onClick={() => nav('/portal/my')} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-3">
        <ArrowLeft size={12} /> 대시보드로
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h1 className="text-base font-bold text-gray-900">서류 업로드</h1>
          <p className="text-xs text-gray-500 mt-0.5">필수 서류 3종 및 운영 편의 서류 3종</p>
        </div>

        <div className="p-4 space-y-3">
          {DOCS.map(d => {
            const doc = docs.find(x => x.doc_type === d.key)
            const status = doc?.status ?? 'pending'
            const isUploading = uploading === d.key

            return (
              <div key={d.key} className={`rounded-xl border p-4 ${
                status === 'approved' ? 'bg-emerald-50 border-emerald-200'
                  : status === 'rejected' ? 'bg-red-50 border-red-300'
                  : status === 'submitted' ? 'bg-amber-50 border-amber-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    {status === 'approved' ? <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      : status === 'rejected' ? <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                      : status === 'submitted' ? <Clock size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      : <FileText size={16} className="text-gray-400 shrink-0 mt-0.5" />}
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-900 flex items-center gap-1">
                        {d.label}
                        {d.required && <span className="text-red-500 text-xs">*필수</span>}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{d.desc}</div>
                    </div>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    status === 'approved' ? 'bg-emerald-600 text-white'
                      : status === 'rejected' ? 'bg-red-600 text-white'
                      : status === 'submitted' ? 'bg-amber-600 text-white'
                      : 'bg-gray-300 text-gray-700'
                  }`}>
                    {status === 'approved' ? '승인'
                      : status === 'rejected' ? '반려'
                      : status === 'submitted' ? '검토중'
                      : '대기'}
                  </span>
                </div>

                {doc?.rejection_reason && (
                  <div className="mb-2 px-3 py-2 bg-white border border-red-200 rounded-lg text-xs text-red-700">
                    <strong>반려 사유:</strong> {doc.rejection_reason}
                  </div>
                )}

                <input
                  ref={el => { inputRefs.current[d.key] = el }}
                  type="file"
                  accept="image/*,.pdf"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(d.key, f)
                  }}
                />
                <button
                  type="button"
                  onClick={() => inputRefs.current[d.key]?.click()}
                  disabled={isUploading || status === 'approved'}
                  className={`w-full py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${
                    status === 'approved' ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
                >
                  <Upload size={12} />
                  {isUploading ? '업로드 중...'
                    : status === 'approved' ? '승인 완료'
                    : status === 'rejected' || status === 'submitted' ? '다시 업로드'
                    : '파일 선택'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </PortalLayout>
  )
}
