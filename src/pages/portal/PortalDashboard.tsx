import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Clock, AlertTriangle, ArrowRight, FileText, MapPin, Send, FileSignature, Settings } from 'lucide-react'
import { PortalLayout } from './PortalLayout'
import { portalApi } from '../../lib/portal-api'

interface Me {
  partner: Record<string, unknown>
  documents: Array<{ doc_type: string; status: string; rejection_reason: string | null; reviewed_at: string | null }>
  history: Array<{ from_stage: string | null; to_stage: string; to_status: string; reason: string | null; created_at: string }>
  proposalCode: { hasActive: boolean; viewsLeft: number } | null
  zoneRequest: Array<{ id: string; request_type: string; status: string; to_zone_code: string | null; created_at: string; decision_reason: string | null }>
  contracts: Array<{ id: string; template_type: string | null; signok_status: string | null; sent_date: string | null; signed_date: string | null }>
}

const STAGE_ORDER = ['inbound', 'doc_review', 'contracting', 'operating']
const STAGE_LABELS: Record<string, string> = {
  inbound: '신청', doc_review: '검토', contracting: '계약', operating: '운영중', terminated: '종료',
}

const DOC_LABELS: Record<string, string> = {
  business_cert: '사업자등록증',
  bank_statement: '지급통장 사본',
  id_card: '대표자 신분증',
  biz_signup: '배민 비즈 가입내역',
  unipost: '유니포스트 가입내역',
  tax_cert: '전자세금 공동인증서',
}

const DOC_ORDER = ['business_cert', 'bank_statement', 'id_card', 'biz_signup', 'unipost', 'tax_cert']
const REQUIRED_DOCS = ['business_cert', 'bank_statement', 'id_card']

export function PortalDashboard() {
  const nav = useNavigate()
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    portalApi.me()
      .then(setMe)
      .catch(() => nav('/portal'))
      .finally(() => setLoading(false))
  }, [nav])

  if (loading) {
    return <PortalLayout showLogout><div className="text-center py-20 text-gray-400">불러오는 중...</div></PortalLayout>
  }
  if (!me) return null

  const p = me.partner as Record<string, string | null>
  const currentStageIdx = STAGE_ORDER.indexOf(p.pipeline_stage ?? '')
  const approvedDocs = me.documents.filter(d => d.status === 'approved')
  const rejectedDocs = me.documents.filter(d => d.status === 'rejected')
  const requiredApproved = REQUIRED_DOCS.filter(k => approvedDocs.find(d => d.doc_type === k)).length
  const pendingZoneRequest = me.zoneRequest.find(r => r.status === 'pending')
  const activeContract = me.contracts[0]

  // 다음 액션 결정
  let nextAction: { icon: typeof FileText; title: string; desc: string; cta: string; link: string; highlight: 'primary' | 'warning' | 'info' } | null = null

  if (p.pipeline_stage === 'inbound') {
    if (rejectedDocs.length > 0 || requiredApproved < 3) {
      nextAction = { icon: FileText, title: '서류를 업로드해주세요', desc: `필수 서류 ${requiredApproved}/3 완료${rejectedDocs.length > 0 ? ` · 반려 ${rejectedDocs.length}건 보완 필요` : ''}`, cta: '서류 업로드', link: '/portal/my/documents', highlight: rejectedDocs.length > 0 ? 'warning' : 'primary' }
    } else if (me.proposalCode?.hasActive) {
      nextAction = { icon: Send, title: '보안 제안서가 도착했습니다', desc: `인증코드를 입력하고 제안서를 확인하세요 · 남은 조회 ${me.proposalCode.viewsLeft}회`, cta: '제안서 확인', link: '/portal/my/proposal', highlight: 'primary' }
    } else {
      nextAction = { icon: Clock, title: '담당자 검토 중', desc: '서류 검토가 완료되면 제안서를 보내드립니다', cta: '내 서류 확인', link: '/portal/my/documents', highlight: 'info' }
    }
  } else if (p.pipeline_stage === 'doc_review') {
    if (pendingZoneRequest) {
      nextAction = { icon: Clock, title: '권역 선택 검토 중', desc: `신청하신 권역 "${pendingZoneRequest.to_zone_code}"을(를) 운영팀에서 확인 중입니다`, cta: '상태 확인', link: '/portal/my/zone', highlight: 'info' }
    } else if (me.proposalCode?.hasActive) {
      nextAction = { icon: MapPin, title: '권역을 선택해주세요', desc: '제안서를 확인하고 운영 권역을 선택해주세요', cta: '권역 선택', link: '/portal/my/proposal', highlight: 'primary' }
    } else {
      nextAction = { icon: FileText, title: '서류 보완이 필요할 수 있습니다', desc: rejectedDocs.length > 0 ? `반려 ${rejectedDocs.length}건 확인` : '담당자 검토 중', cta: '서류 확인', link: '/portal/my/documents', highlight: rejectedDocs.length > 0 ? 'warning' : 'info' }
    }
  } else if (p.pipeline_stage === 'contracting') {
    nextAction = { icon: FileSignature, title: '계약서를 확인해주세요', desc: activeContract?.signok_status === 'signed' ? '계약 체결 완료. BRMS 등록 대기' : '싸인오케이 링크로 계약서에 서명해주세요', cta: '계약서 보기', link: '/portal/my/contract', highlight: 'primary' }
  } else if (p.pipeline_stage === 'operating') {
    nextAction = { icon: Settings, title: '운영 관리', desc: '세트 발주, 권역 변경, 정보 변경을 관리하세요', cta: '운영 어드민', link: '/portal/my/sets', highlight: 'primary' }
  }

  return (
    <PortalLayout showLogout>
      {/* 프로필 헤더 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-xs text-gray-500 mb-0.5">안녕하세요</div>
            <h1 className="text-lg font-bold text-gray-900">{p.applicant_name} 사장님</h1>
            <div className="text-sm text-gray-600 mt-0.5">
              {p.company_name}
              {p.confirmed_zone_code && <span className="text-gray-400 ml-2">· {p.confirmed_zone_code}</span>}
            </div>
          </div>
          {p.dp_code && (
            <span className="text-[11px] font-mono px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded">{p.dp_code}</span>
          )}
        </div>

        {/* 단계 타임라인 */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-2 left-0 right-0 h-0.5 bg-gray-200" />
            <div className="absolute top-2 left-0 h-0.5 bg-emerald-500 transition-all"
              style={{ width: `${(currentStageIdx / (STAGE_ORDER.length - 1)) * 100}%` }} />
            {STAGE_ORDER.map((s, idx) => (
              <div key={s} className="relative flex flex-col items-center z-10">
                <div className={`w-4 h-4 rounded-full border-2 transition-colors ${
                  idx < currentStageIdx ? 'bg-emerald-500 border-emerald-500'
                    : idx === currentStageIdx ? 'bg-white border-emerald-500 ring-4 ring-emerald-100'
                    : 'bg-white border-gray-300'
                }`} />
                <span className={`mt-1.5 text-[10px] font-medium ${
                  idx <= currentStageIdx ? 'text-emerald-600' : 'text-gray-400'
                }`}>{STAGE_LABELS[s]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 다음 액션 카드 */}
      {nextAction && (
        <div className={`rounded-2xl p-5 mb-4 border cursor-pointer transition-all hover:shadow-md ${
          nextAction.highlight === 'primary' ? 'bg-emerald-50 border-emerald-200'
            : nextAction.highlight === 'warning' ? 'bg-amber-50 border-amber-300'
            : 'bg-sky-50 border-sky-200'
        }`} onClick={() => nav(nextAction.link)}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              nextAction.highlight === 'primary' ? 'bg-emerald-500 text-white'
                : nextAction.highlight === 'warning' ? 'bg-amber-500 text-white'
                : 'bg-sky-500 text-white'
            }`}>
              <nextAction.icon size={18} />
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">지금 필요한 액션</div>
              <h3 className="text-base font-bold text-gray-900">{nextAction.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{nextAction.desc}</p>
              <div className={`mt-3 inline-flex items-center gap-1 text-sm font-bold ${
                nextAction.highlight === 'primary' ? 'text-emerald-700'
                  : nextAction.highlight === 'warning' ? 'text-amber-700'
                  : 'text-sky-700'
              }`}>
                {nextAction.cta} <ArrowRight size={14} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 서류 현황 요약 */}
      {p.pipeline_stage !== 'operating' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">서류 현황</h3>
            <button onClick={() => nav('/portal/my/documents')} className="text-xs text-emerald-600 font-semibold hover:text-emerald-700">
              전체 관리 <ArrowRight size={11} className="inline" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DOC_ORDER.map((k) => {
              const doc = me.documents.find(d => d.doc_type === k)
              const status = doc?.status ?? 'pending'
              const required = REQUIRED_DOCS.includes(k)
              return (
                <div key={k} className={`flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg ${
                  status === 'approved' ? 'bg-emerald-50 text-emerald-700'
                    : status === 'rejected' ? 'bg-red-50 text-red-700'
                    : status === 'submitted' ? 'bg-amber-50 text-amber-700'
                    : 'bg-gray-50 text-gray-500'
                }`}>
                  {status === 'approved' ? <CheckCircle size={12} />
                    : status === 'rejected' ? <AlertTriangle size={12} />
                    : <Clock size={12} />}
                  <span className="truncate">{DOC_LABELS[k]}</span>
                  {required && <span className="text-[9px] ml-auto shrink-0">*</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 최근 이력 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3">진행 이력</h3>
        {me.history.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3">아직 이력이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {me.history.slice(0, 5).map((h, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div className="flex-1 text-xs">
                  <div className="text-gray-900">
                    {STAGE_LABELS[h.to_stage] ?? h.to_stage} · {h.to_status}
                  </div>
                  {h.reason && <div className="text-gray-500 text-[11px] mt-0.5">{h.reason}</div>}
                  <div className="text-gray-400 text-[10px] mt-0.5">{h.created_at?.slice(0, 16)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 text-center text-[11px] text-gray-400">
        문의: 3PL 운영지원센터 · 카카오톡 사장님 문의
      </div>
    </PortalLayout>
  )
}
