import { Bell, Search, Plus } from 'lucide-react'

interface TopHeaderProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  onAddPartner: () => void
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
