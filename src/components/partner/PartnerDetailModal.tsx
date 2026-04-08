import { useEffect, useState } from 'react'
import { X, Save, ExternalLink, CheckCircle, Clock, AlertTriangle, Send, History } from 'lucide-react'
import { fetchPartnerDetail } from '../../lib/api'
import { STATUS_LABELS } from '../../types/partner'
import type { Partner, PartnerDocument, Contract } from '../../types/partner'

interface PartnerDetailModalProps {
  partnerId: string
  onClose: () => void
  onUpdate: () => void
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900 min-h-[20px]">{value ?? '-'}</dd>
    </div>
  )
}

interface DetailData {
  partner: Partner
  documents: PartnerDocument[]
  contracts: Contract[]
  bankAccounts: { id: string; bank_name: string; account_number: string; account_holder: string }[]
  insurance: { id: string; policy_number: string; start_date: string; end_date: string; status: string }[]
  notes: { id: string; note_type: string; content: string; author_name: string; created_at: string }[]
  statusHistory: { id: string; from_stage: string; from_status: string; to_stage: string; to_status: string; created_at: string }[]
}

export function PartnerDetailModal({ partnerId, onClose, onUpdate: _onUpdate }: PartnerDetailModalProps) {
  const [data, setData] = useState<DetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info')

  useEffect(() => {
    setLoading(true)
    fetchPartnerDetail(partnerId)
      .then(setData)
      .finally(() => setLoading(false))
  }, [partnerId])

  if (loading || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative bg-white rounded-2xl p-12 text-gray-400">불러오는 중...</div>
      </div>
    )
  }

  const { partner, contracts, bankAccounts, statusHistory } = data
  const latestContract = contracts[0]
  const currentBank = bankAccounts[0]
  const isSimIgwaSe = partner.business_type === '간이과세'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-[880px] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-gray-900">{partner.company_name}</h2>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
              {STATUS_LABELS[partner.status] ?? partner.status}
            </span>
            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
              {partner.contract_type === 'direct' ? '직계약' : '중개사'}
            </span>
            {partner.dp_code && (
              <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded font-mono">
                {partner.dp_code}
              </span>
            )}
            {!isSimIgwaSe && partner.business_type && (
              <span className="text-[11px] font-semibold text-emerald-600 border border-emerald-300 px-2 py-0.5 rounded">
                &#10003; 과세유형 통과
              </span>
            )}
            {isSimIgwaSe && (
              <span className="text-[11px] font-semibold text-red-500 border border-red-300 px-2 py-0.5 rounded">
                &#9888; 간이과세자 불가
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
              <Save size={14} /> 저장
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg">
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          <button
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('info')}
          >
            상세 정보
          </button>
          <button
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('history')}
          >
            <History size={14} /> 이력 ({statusHistory.length})
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'info' ? (
            <>
              {/* 인바운드 정보 */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-blue-600">인바운드 정보</h3>
                  <button className="text-xs px-3 py-1.5 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 font-medium">
                    <Send size={12} className="inline mr-1" />보안 제안서 발송
                  </button>
                </div>
                <dl className="grid grid-cols-4 gap-x-6 gap-y-3">
                  <InfoField label="신청일" value={partner.apply_date} />
                  <InfoField label="지원자명" value={partner.applicant_name} />
                  <InfoField label="이메일" value={partner.email} />
                  <InfoField label="대표번호" value={partner.phone} />
                  <InfoField label="사업자 형태" value={partner.business_type} />
                  <InfoField label="사업자등록번호" value={partner.business_number} />
                  <InfoField label="경력" value={partner.experience_years} />
                  <InfoField label="라이더 인원수" value={partner.rider_count} />
                </dl>
              </section>

              <hr className="border-gray-100" />

              {/* 사업자 등록 정보 */}
              <section>
                <h3 className="text-sm font-bold text-gray-700 mb-3">사업자 등록 정보</h3>
                <dl className="grid grid-cols-4 gap-x-6 gap-y-3">
                  <InfoField label="대표자명" value={partner.representative_name} />
                  <InfoField label="개업연월일" value={partner.business_open_date} />
                  <InfoField label="업태" value={partner.business_category} />
                  <InfoField label="종목" value={partner.business_item} />
                  <InfoField label="사업장소재지" value={partner.business_address} />
                  <InfoField label="대표자 연락처" value={partner.representative_phone} />
                </dl>
              </section>

              <hr className="border-gray-100" />

              {/* 권역 & 계약 */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-emerald-600">권역 매핑 & 계약</h3>
                  <button className="text-xs px-3 py-1.5 border border-emerald-300 text-emerald-600 rounded-lg hover:bg-emerald-50 font-semibold">
                    Set Tracker 요금제 추천
                  </button>
                </div>
                <dl className="grid grid-cols-4 gap-x-6 gap-y-3">
                  <InfoField label="희망지역" value={partner.desired_region_text} />
                  <InfoField label="확정 권역" value={partner.confirmed_zone_code} />
                  <InfoField label="요금제" value={partner.pricing_plan} />
                  <InfoField label="계약 템플릿" value={partner.contract_template} />
                  {latestContract && (
                    <>
                      <InfoField label="계약서 발송일" value={latestContract.sent_date} />
                      <InfoField label="계약 체결일" value={latestContract.signed_date} />
                      <InfoField label="계약 시작일" value={latestContract.contract_start_date} />
                      <InfoField label="계약 종료일" value={latestContract.contract_end_date} />
                    </>
                  )}
                </dl>
              </section>

              <hr className="border-gray-100" />

              {/* 계좌 & 운영 */}
              <section>
                <h3 className="text-sm font-bold text-gray-700 mb-3">계좌 & 운영 정보</h3>
                <dl className="grid grid-cols-4 gap-x-6 gap-y-3">
                  {currentBank && (
                    <>
                      <InfoField label="은행명" value={currentBank.bank_name} />
                      <InfoField label="계좌번호" value={currentBank.account_number} />
                      <InfoField label="예금주" value={currentBank.account_holder} />
                    </>
                  )}
                  <InfoField label="DP 코드" value={partner.dp_code} />
                  <InfoField label="비즈 ID" value={partner.biz_id} />
                  <InfoField label="SAP 코드" value={partner.sap_code} />
                  <InfoField label="운영 시작일" value={partner.operating_start_date} />
                  <InfoField label="담당팀" value={partner.assigned_team} />
                </dl>
              </section>
            </>
          ) : (
            /* 이력 탭 */
            <section>
              <h3 className="text-sm font-bold text-gray-700 mb-3">상태 변경 이력</h3>
              {statusHistory.length === 0 ? (
                <p className="text-sm text-gray-400 py-4">변경 이력이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {statusHistory.map((h) => (
                    <div key={h.id} className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-lg text-sm">
                      <span className="text-xs text-gray-400 w-36 shrink-0">{h.created_at?.slice(0, 16)}</span>
                      <span className="text-gray-500">{h.from_stage}/{h.from_status}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium text-gray-900">{h.to_stage}/{h.to_status}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100">
            닫기
          </button>
          <div className="flex gap-2">
            {partner.pipeline_stage === 'contracting' && (
              <button className="text-sm px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium">
                <ExternalLink size={14} className="inline mr-1" />
                싸인오케이 API 발송
              </button>
            )}
            {partner.pipeline_stage === 'operating' && (
              <button className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                BRMS Export
              </button>
            )}
            {partner.pipeline_stage !== 'operating' && partner.pipeline_stage !== 'terminated' && (
              <button className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                다음 단계로 이동
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
