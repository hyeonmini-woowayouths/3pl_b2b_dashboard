import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core'
import { useState } from 'react'
import { KanbanColumn } from './KanbanColumn'
import { PartnerCard } from './PartnerCard'
import { PIPELINE_STAGES } from '../../types/partner'
import type { Partner, PipelineStage } from '../../types/partner'

interface KanbanBoardProps {
  kanban: Record<string, { count: number; partners: Partner[] }>
  onPartnerClick: (partner: Partner) => void
  onPartnerMove: (partnerId: string, toStage: PipelineStage) => void
}

export function KanbanBoard({ kanban, onPartnerClick, onPartnerMove }: KanbanBoardProps) {
  const [activePartner, setActivePartner] = useState<Partner | null>(null)

  const allPartners = Object.values(kanban).flatMap((s) => s.partners)

  function handleDragStart(event: DragStartEvent) {
    const partner = allPartners.find((p) => p.id === event.active.id)
    if (partner) setActivePartner(partner)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActivePartner(null)
    const { active, over } = event
    if (!over) return

    const partnerId = active.id as string
    const targetStage = over.id as PipelineStage

    const partner = allPartners.find((p) => p.id === partnerId)
    if (partner && partner.pipeline_stage !== targetStage) {
      onPartnerMove(partnerId, targetStage)
    }
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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
            />
          )
        })}
      </div>

      <DragOverlay>
        {activePartner ? (
          <div className="opacity-80 rotate-2">
            <PartnerCard partner={activePartner} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
