import { useState } from 'react'
import { Sidebar } from '../components/layout/Sidebar'
import { TopHeader } from '../components/layout/TopHeader'
import { KanbanBoard } from '../components/kanban/KanbanBoard'
import { KanbanFilters, DEFAULT_FILTERS } from '../components/kanban/KanbanFilters'
import type { FilterState } from '../components/kanban/KanbanFilters'
import { PartnerDetailModal } from '../components/partner/PartnerDetailModal'
import { NewPartnerModal } from '../components/partner/NewPartnerModal'
import { usePartners } from '../hooks/usePartners'
import type { Partner } from '../types/partner'

export function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null)
  const [showNewPartner, setShowNewPartner] = useState(false)

  const { kanban, loading, error, movePartner, reload } = usePartners({
    search: searchQuery || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    contractType: filters.contractType,
    statuses: filters.statuses.length > 0 ? filters.statuses : undefined,
  })

  const handlePartnerClick = (partner: Partner) => {
    setSelectedPartnerId(partner.id)
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <TopHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAddPartner={() => setShowNewPartner(true)}
        />

        <div className="px-6 pt-4 pb-2">
          <KanbanFilters filters={filters} onChange={setFilters} />
        </div>

        <div className="flex-1 overflow-auto px-6 pb-6">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              API 연결 실패: {error}
              <button onClick={reload} className="ml-3 underline font-medium">다시 시도</button>
            </div>
          )}

          {loading && Object.keys(kanban).length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              데이터를 불러오는 중...
            </div>
          ) : (
            <KanbanBoard
              kanban={kanban}
              onPartnerClick={handlePartnerClick}
              onPartnerMove={movePartner}
            />
          )}
        </div>
      </main>

      {selectedPartnerId && (
        <PartnerDetailModal
          partnerId={selectedPartnerId}
          onClose={() => setSelectedPartnerId(null)}
          onUpdate={reload}
        />
      )}

      {showNewPartner && (
        <NewPartnerModal
          onClose={() => setShowNewPartner(false)}
          onCreated={reload}
        />
      )}
    </div>
  )
}
