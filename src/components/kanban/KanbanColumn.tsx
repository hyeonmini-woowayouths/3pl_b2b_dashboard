import { useDroppable } from '@dnd-kit/core'
import { PartnerCard } from './PartnerCard'
import type { Partner, PipelineStage } from '../../types/partner'

interface KanbanColumnProps {
  stage: { key: PipelineStage; label: string; color: string }
  partners: Partner[]
  onPartnerClick: (partner: Partner) => void
}

export function KanbanColumn({ stage, partners, onPartnerClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key })

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[280px] max-w-[340px] flex flex-col rounded-xl transition-colors ${
        isOver ? 'bg-blue-50 ring-2 ring-blue-300' : 'bg-gray-100/70'
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <span className="text-sm font-semibold text-gray-700">{stage.label}</span>
        </div>
        <span className="text-xs font-bold text-gray-500 bg-white px-2 py-0.5 rounded-full">
          {partners.length}
        </span>
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
            카드를 여기에 드래그하세요
          </div>
        )}
      </div>
    </div>
  )
}
