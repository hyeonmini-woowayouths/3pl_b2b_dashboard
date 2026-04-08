import { useState } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { TopHeader } from './components/layout/TopHeader'
import { KanbanBoard } from './components/kanban/KanbanBoard'
import { PartnerDetailModal } from './components/partner/PartnerDetailModal'
import { useMockPartners } from './hooks/useMockPartners'
import type { Partner } from './types/partner'

export default function App() {
  const { partners, movePartner, addPartner } = useMockPartners()
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredPartners = searchQuery
    ? partners.filter(
        (p) =>
          p.company_name.includes(searchQuery) ||
          p.business_number?.includes(searchQuery) ||
          p.applicant_name?.includes(searchQuery)
      )
    : partners

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <TopHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAddPartner={addPartner}
        />

        <div className="flex-1 overflow-auto p-6">
          <KanbanBoard
            partners={filteredPartners}
            onPartnerClick={setSelectedPartner}
            onPartnerMove={movePartner}
          />
        </div>
      </main>

      {selectedPartner && (
        <PartnerDetailModal
          partner={selectedPartner}
          onClose={() => setSelectedPartner(null)}
        />
      )}
    </div>
  )
}
