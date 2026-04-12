import { PartnerCard } from './PartnerCard'
import type { Partner, PipelineStage } from '../../types/partner'

const DATE_BASIS: Record<string, string> = {
  inbound: '신청일 기준',
  doc_review: '갱신일 기준',
  contracting: '갱신일 기준',
  operating: '운영시작일 기준',
}

interface KanbanColumnProps {
  stage: { key: PipelineStage; label: string; color: string }
  partners: Partner[]
  count: number
  onPartnerClick: (partner: Partner) => void
  hasDateFilter?: boolean
}

export function KanbanColumn({ stage, partners, count, onPartnerClick, hasDateFilter }: KanbanColumnProps) {
  return (
    <div className="flex-1 min-w-[280px] max-w-[340px] flex flex-col rounded-xl bg-gray-100/70">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <span className="text-sm font-semibold text-gray-700">{stage.label}</span>
          </div>
          <span className="text-xs font-bold text-gray-500 bg-white px-2 py-0.5 rounded-full">
            {count}
          </span>
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
            해당 단계에 협력사가 없습니다
          </div>
        )}
        {partners.length < count && (
          <div className="text-center py-2 text-xs text-gray-400">
            +{count - partners.length}건 더 있음
          </div>
        )}
      </div>
    </div>
  )
}
