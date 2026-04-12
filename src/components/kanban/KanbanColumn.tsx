import { useState } from 'react'
import { ArrowUpDown, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PartnerCard } from './PartnerCard'
import type { Partner, PipelineStage } from '../../types/partner'

const DATE_BASIS: Record<string, string> = {
  inbound: '신청일 기준',
  doc_review: '갱신일 기준',
  contracting: '갱신일 기준',
  operating: '운영시작일 기준',
}

const SORT_OPTIONS = [
  { key: 'date_desc', label: '기준일 최신순' },
  { key: 'date_asc', label: '기준일 오래된순' },
  { key: 'name_asc', label: '상호명 ㄱ→ㅎ' },
  { key: 'name_desc', label: '상호명 ㅎ→ㄱ' },
]

interface KanbanColumnProps {
  stage: { key: PipelineStage; label: string; color: string }
  partners: Partner[]
  count: number
  onPartnerClick: (partner: Partner) => void
  hasDateFilter?: boolean
  sortBy: string
  onSortChange: (sort: string) => void
}

export function KanbanColumn({ stage, partners, count, onPartnerClick, hasDateFilter, sortBy, onSortChange }: KanbanColumnProps) {
  const [showSort, setShowSort] = useState(false)

  return (
    <div className="flex-1 min-w-[280px] max-w-[340px] flex flex-col rounded-xl bg-gray-100/70">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
            <span className="text-sm font-semibold text-gray-700">{stage.label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* 정렬 */}
            <div className="relative">
              <button
                onClick={() => setShowSort(!showSort)}
                className="p-1 hover:bg-white rounded transition-colors"
                title="정렬"
              >
                <ArrowUpDown size={13} className="text-gray-400" />
              </button>
              {showSort && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSort(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-40">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => { onSortChange(opt.key); setShowSort(false) }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${
                          sortBy === opt.key ? 'text-blue-600 font-semibold bg-blue-50' : 'text-gray-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <span className="text-xs font-bold text-gray-500 bg-white px-2 py-0.5 rounded-full">
              {count}
            </span>
          </div>
        </div>
        {hasDateFilter && (
          <div className="text-[10px] text-gray-400 mt-1 ml-[18px]">{DATE_BASIS[stage.key]}</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
        {partners.map((partner) => (
          <PartnerCard
            key={partner.id}
            partner={partner}
            onClick={() => onPartnerClick(partner)}
          />
        ))}
        {partners.length === 0 && (
          <div className="text-center py-8 text-xs text-gray-400">
            해당 기간에 데이터가 없습니다
          </div>
        )}
        {partners.length < count && (
          <Link
            to={`/partners?stage=${stage.key}`}
            className="flex items-center justify-center gap-1.5 py-2.5 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <ExternalLink size={12} />
            +{count - partners.length}건 더보기 (리스트 뷰)
          </Link>
        )}
      </div>
    </div>
  )
}
