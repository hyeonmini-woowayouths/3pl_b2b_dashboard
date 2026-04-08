import { useState } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { TopHeader } from './components/layout/TopHeader'
import { KanbanBoard } from './components/kanban/KanbanBoard'
import { PartnerDetailModal } from './components/partner/PartnerDetailModal'
import { usePartners } from './hooks/usePartners'
import type { Partner } from './types/partner'

export default function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null)
  const { kanban, loading, error, movePartner, reload } = usePartners(searchQuery)

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
          onAddPartner={() => {/* TODO: 신규 인바운드 모달 */}}
        />

        <div className="flex-1 overflow-auto p-6">
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
    </div>
  )
}
