import { useEffect, useState, useCallback } from 'react'
import { X, Save, ExternalLink, CheckCircle, Clock, AlertTriangle, Send, History, MessageSquare, MapPin, FileText } from 'lucide-react'
import { fetchPartnerDetail, updatePartner, updateDocument, addNote, movePartnerStage, fetchZones } from '../../lib/api'
import { STATUS_LABELS, PIPELINE_STAGES } from '../../types/partner'
import type { Partner, PartnerDocument, Contract, Zone, DocType, DocStatus } from '../../types/partner'

interface Props {
  partnerId: string
  onClose: () => void
  onUpdate: () => void
}

interface DetailData {
  partner: Partner
  documents: PartnerDocument[]
  contracts: Contract[]
  bankAccounts: { id: string; bank_name: string; account_number: string; account_holder: string }[]
  insurance: { id: string; policy_number: string; start_date: string; end_date: string; status: string }[]
  notes: { id: string; note_type: string; content: string; author_name: string; created_at: string }[]
  statusHistory: { id: string; from_stage: string; from_status: string; to_stage: string; to_status: string; reason: string | null; created_at: string }[]
}

const DOC_TYPES: { key: DocType; label: string; required: boolean }[] = [
  { key: 'business_cert', label: '사업자등록증', required: true },
  { key: 'bank_statement', label: '지급통장 사본', required: true },
  { key: 'id_card', label: '대표자 신분증', required: true },
  { key: 'biz_signup', label: '배민 비즈 가입내역', required: false },
  { key: 'unipost', label: '유니포스트 가입내역', required: false },
  { key: 'tax_cert', label: '전자세금 공동인증서', required: false },
]

function EditableField({ label, value, onSave, type = 'text' }: {
  label: string; value: string | null | undefined; onSave: (v: string) => void; type?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  if (!editing) {
    return (
      <div className="group cursor-pointer" onClick={() => { setDraft(value ?? ''); setEditing(true) }}>
        <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</dt>
        <dd className="mt-0.5 text-sm text-gray-900 min-h-[20px] group-hover:bg-blue-50 group-hover:rounded px-1 -mx-1 transition-colors">
          {value || <span className="text-gray-300">클릭하여 입력</span>}
        </dd>
      </div>
    )
  }

  return (
    <div>
      <dt className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">{label}</dt>
      <div className="flex gap-1 mt-0.5">
        <input
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { onSave(draft); setEditing(false) } if (e.key === 'Escape') setEditing(false) }}
          autoFocus
          className="flex-1 text-sm px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <button onClick={() => { onSave(draft); setEditing(false) }} className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
          <Save size={12} />
        </button>
        <button onClick={() => setEditing(false)} className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100">
          <X size={12} />
        </button>
      </div>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900 min-h-[20px]">{value ?? '-'}</dd>
    </div>
  )
}

export function PartnerDetailModal({ partnerId, onClose, onUpdate }: Props) {
  const [data, setData] = useState<DetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'info' | 'docs' | 'history' | 'notes'>('info')
  const [newNote, setNewNote] = useState('')
  const [rejectionDraft, setRejectionDraft] = useState<{ docType: DocType; reason: string } | null>(null)
  const [zoneResults, setZoneResults] = useState<Zone[]>([])
  const [showZoneSearch, setShowZoneSearch] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    const d = await fetchPartnerDetail(partnerId)
    setData(d)
    setLoading(false)
  }, [partnerId])

  useEffect(() => { reload() }, [reload])

  const handleFieldSave = async (field: string, value: string) => {
    await updatePartner(partnerId, { [field]: value || null })
    await reload()
    onUpdate()
  }

  const handleDocAction = async (docType: DocType, status: DocStatus, reason?: string) => {
    await updateDocument(partnerId, docType, status, reason)
    setRejectionDraft(null)
    await reload()
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    await addNote(partnerId, newNote.trim())
    setNewNote('')
    await reload()
  }

  const handleZoneSearch = async (query: string) => {
    if (query.length < 2) { setZoneResults([]); return }
    const res = await fetchZones(query, true)
    setZoneResults(res.data.slice(0, 10))
  }

  const handleStageMove = async (stage: string) => {
    const reason = prompt('변경 사유를 입력하세요 (선택)')
    await movePartnerStage(partnerId, stage, undefined)
    if (reason) await addNote(partnerId, `[상태 변경] → ${stage}: ${reason}`, 'general')
    await reload()
    onUpdate()
  }

  if (loading || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative bg-white rounded-2xl p-12 text-gray-400">불러오는 중...</div>
      </div>
    )
  }

  const { partner, documents, contracts, bankAccounts, statusHistory, notes } = data
  const latestContract = contracts[0]
  const currentBank = bankAccounts[0]
  const isSimIgwaSe = partner.business_type === '간이과세'
  const allDocsApproved = DOC_TYPES.filter(d => d.required).every(d => documents.find(doc => doc.doc_type === d.key && doc.status === 'approved'))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[920px] max-h-[92vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-gray-900">{partner.company_name}</h2>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
              {STATUS_LABELS[partner.status] ?? partner.status}
            </span>
            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
              {partner.contract_type === 'direct' ? '직계약' : '중개사'}
            </span>
            {partner.dp_code && (
              <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded font-mono">{partner.dp_code}</span>
            )}
            {!isSimIgwaSe && partner.business_type && (
              <span className="text-[11px] font-semibold text-emerald-600 border border-emerald-300 px-2 py-0.5 rounded">&#10003; 과세유형 통과</span>
            )}
            {isSimIgwaSe && (
              <span className="text-[11px] font-semibold text-red-500 border border-red-300 px-2 py-0.5 rounded">&#9888; 간이과세자 불가</span>
            )}
            {allDocsApproved && (
              <span className="text-[11px] font-semibold text-emerald-600 border border-emerald-300 px-2 py-0.5 rounded">&#10003; 필수서류 완료</span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg"><X size={18} className="text-gray-500" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 shrink-0">
          {[
            { key: 'info' as const, icon: FileText, label: '상세 정보' },
            { key: 'docs' as const, icon: CheckCircle, label: `서류 검토 (${documents.length}/${DOC_TYPES.length})` },
            { key: 'notes' as const, icon: MessageSquare, label: `메모 (${notes.length})` },
            { key: 'history' as const, icon: History, label: `이력 (${statusHistory.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {activeTab === 'info' && (
            <>
              {/* 인바운드 정보 (인라인 수정) */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-blue-600">인바운드 정보</h3>
                  <button className="text-xs px-3 py-1.5 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 font-medium">
                    <Send size={12} className="inline mr-1" />보안 제안서 발송
                  </button>
                </div>
                <dl className="grid grid-cols-4 gap-x-6 gap-y-3">
                  <InfoField label="신청일" value={partner.apply_date} />
                  <EditableField label="지원자명" value={partner.applicant_name} onSave={(v) => handleFieldSave('applicant_name', v)} />
                  <EditableField label="이메일" value={partner.email} onSave={(v) => handleFieldSave('email', v)} type="email" />
                  <EditableField label="대표번호" value={partner.phone} onSave={(v) => handleFieldSave('phone', v)} type="tel" />
                  <EditableField label="사업자 형태" value={partner.business_type} onSave={(v) => handleFieldSave('business_type', v)} />
                  <EditableField label="사업자등록번호" value={partner.business_number} onSave={(v) => handleFieldSave('business_number', v)} />
                  <InfoField label="경력" value={partner.experience_years} />
                  <InfoField label="라이더 인원수" value={partner.rider_count} />
                </dl>
              </section>

              <hr className="border-gray-100" />

              {/* 사업자 등록 정보 */}
              <section>
                <h3 className="text-sm font-bold text-gray-700 mb-3">사업자 등록 정보</h3>
                <dl className="grid grid-cols-4 gap-x-6 gap-y-3">
                  <EditableField label="대표자명" value={partner.representative_name} onSave={(v) => handleFieldSave('representative_name', v)} />
                  <EditableField label="개업연월일" value={partner.business_open_date} onSave={(v) => handleFieldSave('business_open_date', v)} type="date" />
                  <EditableField label="업태" value={partner.business_category} onSave={(v) => handleFieldSave('business_category', v)} />
                  <EditableField label="종목" value={partner.business_item} onSave={(v) => handleFieldSave('business_item', v)} />
                  <EditableField label="사업장소재지" value={partner.business_address} onSave={(v) => handleFieldSave('business_address', v)} />
                  <EditableField label="대표자 연락처" value={partner.representative_phone} onSave={(v) => handleFieldSave('representative_phone', v)} type="tel" />
                </dl>
              </section>

              <hr className="border-gray-100" />

              {/* 권역 매핑 + Set Tracker */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-emerald-600">
                    <MapPin size={14} className="inline mr-1" />권역 매핑 & 계약
                  </h3>
                  <button
                    onClick={() => setShowZoneSearch(!showZoneSearch)}
                    className="text-xs px-3 py-1.5 border border-emerald-300 text-emerald-600 rounded-lg hover:bg-emerald-50 font-semibold"
                  >
                    Set Tracker 요금제 추천
                  </button>
                </div>

                {showZoneSearch && (
                  <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <input
                      type="text"
                      placeholder="권역 검색 (예: 강남, 부천, 용인...)"
                      onChange={(e) => handleZoneSearch(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      autoFocus
                    />
                    {zoneResults.length > 0 && (
                      <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                        {zoneResults.map((z) => (
                          <button
                            key={z.id}
                            onClick={async () => {
                              await updatePartner(partnerId, { confirmed_zone_id: z.id, pricing_plan: z.pricing_plan })
                              setShowZoneSearch(false)
                              await reload()
                              onUpdate()
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-100 rounded flex items-center justify-between"
                          >
                            <span><strong>{z.zone_code}</strong> ({z.rgn1} {z.rgn2})</span>
                            <span className="text-xs text-emerald-600">{z.pricing_plan} / {z.region_class}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

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
          )}

          {activeTab === 'docs' && (
            <section>
              <h3 className="text-sm font-bold text-gray-700 mb-3">필수 제출 서류 검토 ({documents.filter(d => d.status === 'approved').length}/{DOC_TYPES.length})</h3>
              <div className="space-y-2">
                {DOC_TYPES.map((dt) => {
                  const doc = documents.find((d) => d.doc_type === dt.key)
                  const status = doc?.status ?? 'pending'
                  const isRejecting = rejectionDraft?.docType === dt.key

                  return (
                    <div key={dt.key} className={`px-4 py-3 rounded-lg border ${
                      status === 'approved' ? 'bg-emerald-50 border-emerald-200'
                        : status === 'rejected' ? 'bg-red-50 border-red-200'
                        : status === 'submitted' ? 'bg-amber-50 border-amber-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {status === 'approved' ? <CheckCircle size={16} className="text-emerald-500" />
                            : status === 'rejected' ? <AlertTriangle size={16} className="text-red-500" />
                            : status === 'submitted' ? <Clock size={16} className="text-amber-500" />
                            : <Clock size={16} className="text-gray-400" />}
                          <span className={`text-sm font-medium ${
                            status === 'approved' ? 'text-emerald-700'
                              : status === 'rejected' ? 'text-red-700'
                              : 'text-gray-700'
                          }`}>
                            {dt.label} {dt.required && <span className="text-red-400 text-xs">*필수</span>}
                          </span>
                          {doc?.rejection_reason && (
                            <span className="text-xs text-red-500 ml-2">반려: {doc.rejection_reason}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {status !== 'approved' && (
                            <button
                              onClick={() => handleDocAction(dt.key, 'approved')}
                              className="text-xs px-2.5 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                            >승인</button>
                          )}
                          {status !== 'rejected' && (
                            <button
                              onClick={() => setRejectionDraft({ docType: dt.key, reason: '' })}
                              className="text-xs px-2.5 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50"
                            >반려</button>
                          )}
                        </div>
                      </div>

                      {isRejecting && (
                        <div className="mt-2 flex gap-2">
                          <input
                            type="text"
                            value={rejectionDraft.reason}
                            onChange={(e) => setRejectionDraft({ ...rejectionDraft, reason: e.target.value })}
                            placeholder="반려 사유 입력..."
                            className="flex-1 text-sm px-3 py-1.5 border border-red-300 rounded focus:ring-2 focus:ring-red-500 focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleDocAction(dt.key, 'rejected', rejectionDraft.reason) }}
                          />
                          <button
                            onClick={() => handleDocAction(dt.key, 'rejected', rejectionDraft.reason)}
                            className="text-xs px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700"
                          >반려 확정</button>
                          <button onClick={() => setRejectionDraft(null)} className="text-xs px-2 py-1.5 border border-gray-300 rounded">취소</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {activeTab === 'notes' && (
            <section>
              <h3 className="text-sm font-bold text-gray-700 mb-3">메모 & 상담 기록</h3>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote() }}
                  placeholder="메모 입력... (Enter로 저장)"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button onClick={handleAddNote} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">저장</button>
              </div>
              {notes.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">메모가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {notes.map((n) => (
                    <div key={n.id} className="px-4 py-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-500">{n.author_name ?? '시스템'}</span>
                        <span className="text-xs text-gray-400">{n.created_at?.slice(0, 16)}</span>
                      </div>
                      <p className="text-sm text-gray-800">{n.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'history' && (
            <section>
              <h3 className="text-sm font-bold text-gray-700 mb-3">상태 변경 이력</h3>
              {statusHistory.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">변경 이력이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {statusHistory.map((h) => (
                    <div key={h.id} className="flex items-start gap-3 px-4 py-2.5 bg-gray-50 rounded-lg text-sm">
                      <span className="text-xs text-gray-400 w-36 shrink-0 pt-0.5">{h.created_at?.slice(0, 16)}</span>
                      <div>
                        <div>
                          <span className="text-gray-500">{h.from_stage}/{h.from_status}</span>
                          <span className="text-gray-400 mx-1">→</span>
                          <span className="font-medium text-gray-900">{h.to_stage}/{h.to_status}</span>
                        </div>
                        {h.reason && <div className="text-xs text-gray-500 mt-0.5">{h.reason}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
          <button onClick={onClose} className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100">닫기</button>
          <div className="flex gap-2">
            {partner.pipeline_stage === 'contracting' && (
              <button className="text-sm px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium">
                <ExternalLink size={14} className="inline mr-1" />싸인오케이 발송
              </button>
            )}
            {partner.pipeline_stage === 'operating' && (
              <button className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">BRMS Export</button>
            )}
            {partner.pipeline_stage !== 'operating' && partner.pipeline_stage !== 'terminated' && (
              <button
                onClick={() => {
                  const stages = PIPELINE_STAGES.map(s => s.key)
                  const currentIdx = stages.indexOf(partner.pipeline_stage)
                  const nextStage = stages[currentIdx + 1]
                  if (nextStage) handleStageMove(nextStage)
                }}
                className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                다음 단계로 이동
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
