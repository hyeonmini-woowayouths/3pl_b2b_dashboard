import { useState } from 'react'
import { Bell, Search, Plus, Download, ChevronDown } from 'lucide-react'

interface TopHeaderProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  onAddPartner: () => void
}

function ExportDropdown() {
  const [open, setOpen] = useState(false)
  const downloadCsv = (type: 'brms-business' | 'brms-partner') => {
    window.open(`http://localhost:3001/api/partners/export/${type}`, '_blank')
    setOpen(false)
  }
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-sm text-gray-700 rounded-lg hover:bg-gray-50"
      >
        <Download size={14} /> Export <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-64">
            <button onClick={() => downloadCsv('brms-business')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50">
              <div className="font-medium text-gray-900">BRMS 사업자 등록 CSV</div>
              <div className="text-xs text-gray-500">계약 완료 건 — 사업자 정보 (건별 등록용)</div>
            </button>
            <button onClick={() => downloadCsv('brms-partner')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50">
              <div className="font-medium text-gray-900">BRMS 협력사 대량등록 CSV</div>
              <div className="text-xs text-gray-500">계약 완료 건 — 협력사/비즈/권역 정보</div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function TopHeader({ searchQuery, onSearchChange, onAddPartner }: TopHeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <h1 className="text-lg font-bold text-gray-900">협력사 영입 및 온보딩 파이프라인</h1>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="협력사명, 사업자번호 검색..."
            className="pl-9 pr-4 py-2 w-72 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <ExportDropdown />

        <button
          onClick={onAddPartner}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          신규 인바운드
        </button>

        <Bell size={20} className="text-gray-500 cursor-pointer hover:text-gray-700" />

        <div className="flex items-center gap-2 ml-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
            운영
          </div>
          <span className="text-sm font-medium text-gray-700">3PL운영기획</span>
        </div>
      </div>
    </header>
  )
}
