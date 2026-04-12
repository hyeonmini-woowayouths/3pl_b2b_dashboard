import { Filter, Calendar, X } from 'lucide-react'
import { STATUS_LABELS } from '../../types/partner'
import type { PartnerStatus } from '../../types/partner'

export interface FilterState {
  dateFrom: string
  dateTo: string
  contractType: 'all' | 'direct' | 'broker'
  statuses: PartnerStatus[]
}

interface KanbanFiltersProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
}

const CONTRACT_TYPES = [
  { value: 'all' as const, label: '전체' },
  { value: 'direct' as const, label: '직계약' },
  { value: 'broker' as const, label: '중개사' },
]

const QUICK_STATUS_FILTERS: { label: string; statuses: PartnerStatus[] }[] = [
  { label: '서류 반려', statuses: ['docs_rejected'] },
  { label: '검증 실패', statuses: ['validation_failed'] },
  { label: '드랍', statuses: ['dropped'] },
  { label: '서명 대기', statuses: ['contract_sent'] },
  { label: '준비중', statuses: ['preparing'] },
]

export function KanbanFilters({ filters, onChange }: KanbanFiltersProps) {
  const hasActiveFilters =
    filters.dateFrom || filters.dateTo || filters.contractType !== 'all' || filters.statuses.length > 0

  const clearAll = () => onChange({ dateFrom: '', dateTo: '', contractType: 'all', statuses: [] })

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* 기간 프리셋 */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
        {[
          { label: '7일', days: 7 },
          { label: '30일', days: 30 },
          { label: '90일', days: 90 },
          { label: '전체', days: 0 },
        ].map((p) => {
          const isActive = p.days === 0
            ? !filters.dateFrom
            : filters.dateFrom === daysAgo(p.days)
          return (
            <button
              key={p.label}
              onClick={() => onChange({ ...filters, dateFrom: p.days ? daysAgo(p.days) : '', dateTo: '' })}
              className={`px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                isActive ? 'bg-white text-blue-700 font-semibold shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {/* 날짜 직접 선택 */}
      <div className="flex items-center gap-1.5 text-sm">
        <Calendar size={14} className="text-gray-400" />
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
          className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <span className="text-gray-400 text-xs">~</span>
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
          className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* 계약 유형 */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
        {CONTRACT_TYPES.map((ct) => (
          <button
            key={ct.value}
            onClick={() => onChange({ ...filters, contractType: ct.value })}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              filters.contractType === ct.value
                ? 'bg-white text-blue-700 font-semibold shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {ct.label}
          </button>
        ))}
      </div>

      {/* 상태 퀵필터 */}
      <div className="flex items-center gap-1">
        <Filter size={14} className="text-gray-400" />
        {QUICK_STATUS_FILTERS.map((qf) => {
          const isActive = qf.statuses.every((s) => filters.statuses.includes(s))
          return (
            <button
              key={qf.label}
              onClick={() => {
                if (isActive) {
                  onChange({ ...filters, statuses: filters.statuses.filter((s) => !qf.statuses.includes(s)) })
                } else {
                  onChange({ ...filters, statuses: [...filters.statuses, ...qf.statuses] })
                }
              }}
              className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${
                isActive
                  ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {qf.label}
            </button>
          )
        })}
      </div>

      {/* 초기화 */}
      {hasActiveFilters && (
        <button onClick={clearAll} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
          <X size={12} /> 필터 초기화
        </button>
      )}
    </div>
  )
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export const DEFAULT_FILTERS: FilterState = {
  dateFrom: daysAgo(30),
  dateTo: '',
  contractType: 'all',
  statuses: [],
}
