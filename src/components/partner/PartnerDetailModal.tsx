import { X, Save, ExternalLink, CheckCircle, Clock, AlertTriangle, Send } from 'lucide-react'
import { STATUS_LABELS } from '../../types/partner'
import type { Partner } from '../../types/partner'

interface PartnerDetailModalProps {
  partner: Partner
  onClose: () => void
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900 min-h-[20px]">{value ?? '-'}</dd>
    </div>
  )
}

export function PartnerDetailModal({ partner, onClose }: PartnerDetailModalProps) {
  const isSimIgwaSe = partner.business_type === '간이과세'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-[840px] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-gray-900">{partner.company_name}</h2>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
              {STATUS_LABELS[partner.status]}
            </span>
            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
              {partner.contract_type === 'direct' ? '직계약' : '중개사'}
            </span>
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
            <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 인바운드 정보 */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-blue-600">&#9733; 인바운드 정보</h3>
              <button className="text-xs px-3 py-1.5 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 font-medium">
                <Send size={12} className="inline mr-1" />
                보안 제안서 발송
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

          {/* 권역 매핑 & 계약 */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-emerald-600">&#9733; 권역 매핑 & 계약 정보</h3>
              <button className="text-xs px-3 py-1.5 border border-emerald-300 text-emerald-600 rounded-lg hover:bg-emerald-50 font-semibold">
                &#10024; Set Tracker 최적 요금제 추천
              </button>
            </div>
            <dl className="grid grid-cols-4 gap-x-6 gap-y-3">
              <InfoField label="희망지역" value={partner.desired_region_text} />
              <InfoField label="확정 권역" value={partner.confirmed_zone_code} />
              <InfoField label="요금제" value={partner.pricing_plan} />
              <InfoField label="발송 템플릿" value={partner.contract_template} />
              <InfoField label="업태" value={partner.business_category} />
              <InfoField label="종목" value={partner.business_item} />
              <InfoField label="운영 시작일" value={partner.operating_start_date} />
              <InfoField label="DP코드" value={partner.dp_code} />
            </dl>
          </section>

          <hr className="border-gray-100" />

          {/* 서류 상태 */}
          <section>
            <h3 className="text-sm font-bold text-gray-700 mb-3">필수 제출 서류 상태</h3>
            <div className="space-y-2">
              {[
                { label: '사업자등록증', status: 'approved' as const },
                { label: '지급통장 사본', status: 'pending' as const },
                { label: '대표자 신분증', status: 'pending' as const },
                { label: '배민 비즈 가입 내역', status: 'pending' as const },
                { label: '유니포스트 가입 내역', status: 'pending' as const },
                { label: '전자세금 공동인증서', status: 'pending' as const },
              ].map((doc) => (
                <div
                  key={doc.label}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-lg border ${
                    doc.status === 'approved'
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-amber-50/50 border-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm">
                    {doc.status === 'approved' ? (
                      <CheckCircle size={16} className="text-emerald-500" />
                    ) : (
                      <Clock size={16} className="text-amber-500" />
                    )}
                    <span className={doc.status === 'approved' ? 'text-emerald-700' : 'text-amber-700'}>
                      {doc.label}
                    </span>
                    {doc.status === 'approved' && (
                      <span className="text-xs text-emerald-500 ml-2">
                        [{partner.company_name}_{doc.label}.pdf] Drive 적재 완료
                      </span>
                    )}
                  </div>
                  {doc.status === 'pending' && (
                    <button className="text-xs px-2.5 py-1 border border-amber-300 text-amber-600 rounded hover:bg-amber-100">
                      <AlertTriangle size={11} className="inline mr-1" />
                      보완 안내 발송
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
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
