import { useEffect, useState, useCallback } from 'react'
import { Sidebar } from '../components/layout/Sidebar'
import { PartnerDetailModal } from '../components/partner/PartnerDetailModal'
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Download, Filter } from 'lucide-react'
import { STATUS_LABELS } from '../types/partner'
import type { Partner, PipelineStage } from '../types/partner'

const API_BASE = 'http://localhost:3001/api'

const STAGE_LABELS: Record<string, string> = {
  inbound: '인바운드', doc_review: '서류 검토', contracting: '계약 진행',
  operating: '운영중', terminated: '종료',
}

const STAGE_COLORS: Record<string, string> = {
  inbound: 'bg-blue-50 text-blue-700',
  doc_review: 'bg-amber-50 text-amber-700',
  contracting: 'bg-violet-50 text-violet-700',
  operating: 'bg-emerald-50 text-emerald-700',
  terminated: 'bg-gray-100 text-gray-600',
}

interface ListResponse {
  data: Partner[]
  total: number
  limit: number
  offset: number
}

export function PartnersListPage() {
  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('')
  const [contractTypeFilter, setContractTypeFilter] = useState<string>('')
  const [page, setPage] = useState(0)
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null)
  const [sortField, setSortField] = useState<string>('apply_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const limit = 50

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (stageFilter) params.set('stage', stageFilter)
    if (contractTypeFilter) params.set('contract_type', contractTypeFilter)
    params.set('include_terminated', 'true')
    params.set('limit', String(limit))
    params.set('offset', String(page * limit))

    const res = await fetch(`${API_BASE}/partners?${params}`)
    const json = await res.json() as ListResponse
    setData(json)
    setLoading(false)
  }, [search, stageFilter, contractTypeFilter, page])

  useEffect(() => {
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [load])

  const totalPages = data ? Math.ceil(data.total / limit) : 0

  const sortedData = data?.data ? [...data.data].sort((a, b) => {
    const aVal = (a as Record<string, unknown>)[sortField] as string ?? ''
    const bVal = (b as Record<string, unknown>)[sortField] as string ?? ''
    return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
  }) : []

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const SortHeader = ({ field, label, width }: { field: string; label: string; width?: string }) => (
    <th
      className={`text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none ${width ?? ''}`}
      onClick={() => toggleSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={10} className={sortField === field ? 'text-blue-500' : 'text-gray-300'} />
      </span>
    </th>
  )

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
          <h1 className="text-lg font-bold text-gray-900">협력사 계약 리스트</h1>
          <button
            onClick={() => window.open(`${API_BASE}/partners/export/brms-partner`, '_blank')}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-sm text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <Download size={14} /> BRMS Export
          </button>
        </header>

        {/* 필터 바 */}
        <div className="px-6 py-3 bg-white border-b border-gray-100 flex items-center gap-3 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              placeholder="상호명, 사업자번호, 지원자명..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-gray-400" />
            <select value={stageFilter} onChange={(e) => { setStageFilter(e.target.value); setPage(0) }}
              className="text-xs px-2.5 py-2 border border-gray-200 rounded-lg bg-white">
              <option value="">전체 단계</option>
              {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>

            <select value={contractTypeFilter} onChange={(e) => { setContractTypeFilter(e.target.value); setPage(0) }}
              className="text-xs px-2.5 py-2 border border-gray-200 rounded-lg bg-white">
              <option value="">전체 유형</option>
              <option value="direct">직계약</option>
              <option value="broker">중개사</option>
            </select>
          </div>

          <div className="ml-auto text-xs text-gray-500">
            총 {data?.total.toLocaleString() ?? '-'}건
          </div>
        </div>

        {/* 테이블 */}
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[1200px]">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <SortHeader field="company_name" label="상호명" width="w-40" />
                <SortHeader field="business_number" label="사업자번호" width="w-28" />
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase w-16">유형</th>
                <SortHeader field="pipeline_stage" label="단계" width="w-20" />
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase w-20">상태</th>
                <SortHeader field="applicant_name" label="지원자" width="w-20" />
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase w-28">권역</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase w-16">요금제</th>
                <SortHeader field="apply_date" label="신청일" width="w-24" />
                <SortHeader field="operating_start_date" label="운영시작" width="w-24" />
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase w-20">DP코드</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading && !data ? (
                <tr><td colSpan={11} className="text-center py-12 text-gray-400">불러오는 중...</td></tr>
              ) : sortedData.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-12 text-gray-400">결과가 없습니다</td></tr>
              ) : (
                sortedData.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPartnerId(p.id)}
                    className="cursor-pointer hover:bg-blue-50/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-sm font-medium text-gray-900 truncate max-w-[160px]">{p.company_name}</td>
                    <td className="py-2.5 px-3 text-xs text-gray-600 font-mono">{p.business_number ?? '-'}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.contract_type === 'direct' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                        {p.contract_type === 'direct' ? '직계약' : '중개사'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${STAGE_COLORS[p.pipeline_stage] ?? ''}`}>
                        {STAGE_LABELS[p.pipeline_stage] ?? p.pipeline_stage}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[10px] text-gray-500">{STATUS_LABELS[p.status] ?? p.status}</td>
                    <td className="py-2.5 px-3 text-xs text-gray-600 truncate max-w-[80px]">{p.applicant_name ?? '-'}</td>
                    <td className="py-2.5 px-3 text-xs text-gray-600 truncate max-w-[110px]">{p.confirmed_zone_code ?? p.desired_region_text ?? '-'}</td>
                    <td className="py-2.5 px-3 text-xs text-gray-500">{p.pricing_plan ?? '-'}</td>
                    <td className="py-2.5 px-3 text-xs text-gray-500">{p.apply_date ?? '-'}</td>
                    <td className="py-2.5 px-3 text-xs text-gray-500">{p.operating_start_date ?? '-'}</td>
                    <td className="py-2.5 px-3 text-xs text-gray-500 font-mono">{p.dp_code ?? '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="px-6 py-3 bg-white border-t border-gray-200 flex items-center justify-between shrink-0">
            <span className="text-xs text-gray-500">
              {page * limit + 1}~{Math.min((page + 1) * limit, data?.total ?? 0)} / {data?.total.toLocaleString()}건
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                const pageNum = page < 4 ? i : page > totalPages - 4 ? totalPages - 7 + i : page - 3 + i
                if (pageNum < 0 || pageNum >= totalPages) return null
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 text-xs rounded ${pageNum === page ? 'bg-blue-600 text-white font-bold' : 'hover:bg-gray-50 text-gray-600'}`}
                  >
                    {pageNum + 1}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </main>

      {selectedPartnerId && (
        <PartnerDetailModal
          partnerId={selectedPartnerId}
          onClose={() => setSelectedPartnerId(null)}
          onUpdate={load}
        />
      )}
    </div>
  )
}
