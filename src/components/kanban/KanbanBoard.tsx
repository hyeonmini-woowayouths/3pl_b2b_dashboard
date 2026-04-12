import { KanbanColumn } from './KanbanColumn'
import { PIPELINE_STAGES } from '../../types/partner'
import type { Partner } from '../../types/partner'

interface KanbanBoardProps {
  kanban: Record<string, { count: number; partners: Partner[] }>
  onPartnerClick: (partner: Partner) => void
  hasDateFilter?: boolean
  sortBy: string
  onSortChange: (sort: string) => void
}

export function KanbanBoard({ kanban, onPartnerClick, hasDateFilter, sortBy, onSortChange }: KanbanBoardProps) {
  return (
    <div className="flex gap-4 h-full min-h-0">
      {PIPELINE_STAGES.map((stage) => {
        const stageData = kanban[stage.key]
        return (
          <KanbanColumn
            key={stage.key}
            stage={stage}
            partners={stageData?.partners ?? []}
            count={stageData?.count ?? 0}
            onPartnerClick={onPartnerClick}
            hasDateFilter={hasDateFilter}
            sortBy={sortBy}
            onSortChange={onSortChange}
          />
        )
      })}
    </div>
  )
}
