import { useEffect, useRef, useState } from 'react'
import { Search, MapPin, X, ArrowLeft, Users, TrendingUp, Info, CheckCircle } from 'lucide-react'
import { portalApi } from '../../lib/portal-api'
import type { EnrichedZone } from '../../lib/portal-api'
import { ZoneMap } from './ZoneMap'

const COLOR_STYLES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  red:     { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     badge: 'bg-red-100 text-red-700' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  gray:    { bg: 'bg-gray-50',    border: 'border-gray-200',    text: 'text-gray-700',    badge: 'bg-gray-100 text-gray-700' },
}

function formatMan(num: number): string {
  return `${Math.round(num / 10000)}만`
}

interface Props {
  label: string
  value: EnrichedZone | null
  onChange: (z: EnrichedZone | null) => void
  required?: boolean
  excludeId?: string
}

type View = 'select' | 'subregion' | 'zones' | 'search'

export function ZoneSelector({ label, value, onChange, required, excludeId }: Props) {
  const [open, setOpen] = useState(false)

  if (value) {
    return <SelectedZoneCard zone={value} onRemove={() => onChange(null)} />
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2.5 px-4 py-3 border border-dashed border-gray-300 rounded-lg bg-white hover:border-emerald-400 hover:bg-emerald-50/30 text-gray-500 hover:text-emerald-700 transition-colors"
      >
        <MapPin size={16} />
        <span className="text-sm">{label} — 지역을 눌러 권역을 선택하세요</span>
      </button>

      {open && (
        <ZoneSelectorModal
          onClose={() => setOpen(false)}
          onSelect={(z) => { onChange(z); setOpen(false) }}
          excludeId={excludeId}
        />
      )}

      {required && !value && <input required className="sr-only" value="" onChange={() => {}} />}
    </>
  )
}

function SelectedZoneCard({ zone, onRemove }: { zone: EnrichedZone; onRemove: () => void }) {
  const c = COLOR_STYLES[zone.region_class_color] ?? COLOR_STYLES.gray!
  return (
    <div className={`rounded-lg border-2 ${c.border} ${c.bg} p-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.badge}`}>
              {zone.region_class_label}
            </span>
            <span className="font-bold text-gray-900 text-sm">
              {zone.rgn1.replace(/(특별시|광역시|특별자치시|도|특별자치도)/g, '')} {zone.rgn2}
            </span>
            <span className="text-[10px] text-gray-400 font-mono">· {zone.zone_code}</span>
            {zone.set_cap_warning && (
              <span className="text-[10px] font-bold text-red-600 border border-red-300 px-1.5 py-0.5 rounded bg-white">⚠ Set Cap</span>
            )}
          </div>
          <div className="text-[11px] text-gray-600 space-y-0.5">
            <div>💰 {zone.pricing_plan ?? '-'} 요금제 · 주 {zone.weekly_volume}건 기준</div>
            <div>📈 예상 수익: <strong>{formatMan(zone.estimated_weekly_revenue.min)}원 ~ {formatMan(zone.estimated_weekly_revenue.max)}원 / 주</strong> (5세트, 등급별)</div>
            <div>👥 현재 운영: <strong>{zone.active_partners}</strong>곳 (직계약 {zone.direct_partners}, 중개사 {zone.broker_partners})</div>
          </div>
        </div>
        <button type="button" onClick={onRemove}
          className="shrink-0 p-1.5 hover:bg-white rounded">
          <X size={14} className={c.text} />
        </button>
      </div>
    </div>
  )
}

// ── 권역 선택 모달 ──
function ZoneSelectorModal({ onClose, onSelect, excludeId }: {
  onClose: () => void; onSelect: (z: EnrichedZone) => void; excludeId?: string
}) {
  const [view, setView] = useState<View>('select')
  const [regions, setRegions] = useState<Array<{ rgn1: string; zone_count: number }>>([])
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [selectedSubregion, setSelectedSubregion] = useState<string | null>(null)
  const [groups, setGroups] = useState<Array<{ rgn2: string; zones: EnrichedZone[] }>>([])
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<EnrichedZone[]>([])
  const [searching, setSearching] = useState(false)
  const [lastQuery, setLastQuery] = useState<string | null>(null) // 실제로 검색이 끝난 마지막 쿼리
  const [loading, setLoading] = useState(false)
  const [hoveredRgn2, setHoveredRgn2] = useState<string | null>(null)
  const composingRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    portalApi.listRegions().then(r => setRegions(r.regions))
  }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleRegion = async (rgn1: string) => {
    setSelectedRegion(rgn1)
    setSelectedSubregion(null)
    setView('subregion')
    setLoading(true)
    const r = await portalApi.listZonesByRegion(rgn1)
    setGroups(r.groups)
    setLoading(false)
  }

  const handleSubregion = (rgn2: string) => {
    setSelectedSubregion(rgn2)
    setView('zones')
  }

  // 헤더 뒤로가기 단계별 처리
  const goBack = () => {
    if (view === 'zones' && selectedSubregion) {
      setSelectedSubregion(null)
      setView('subregion')
    } else if (view === 'subregion' || view === 'zones') {
      setSelectedRegion(null)
      setSelectedSubregion(null)
      setGroups([])
      setView('select')
    } else {
      setSearchQ('')
      setSearchResults([])
      setLastQuery(null)
      setView('select')
    }
  }

  // 한글 완성 음절(가-힣) 또는 영문/숫자가 1자 이상이어야 의미 있는 검색
  const isMeaningful = (q: string) => /[\uAC00-\uD7A3a-zA-Z0-9]/.test(q)

  const doSearch = async (q: string) => {
    if (!isMeaningful(q)) { setSearchResults([]); setLastQuery(q); setSearching(false); return }
    setSearching(true)
    try {
      const r = await portalApi.searchZones(q)
      setSearchResults(r.suggestions.filter(z => z.id !== excludeId))
      setLastQuery(q)
    } finally {
      setSearching(false)
    }
  }

  const onSearchInput = (v: string) => {
    setSearchQ(v)
    if (v) setView('search')
    else if (view === 'search') setView('select') // 검색어 비우면 select로 복귀
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (composingRef.current) return // IME 조합 중엔 검색 보류
    debounceRef.current = setTimeout(() => doSearch(v), 700)
  }

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !composingRef.current) {
      e.preventDefault()
      if (debounceRef.current) clearTimeout(debounceRef.current)
      doSearch(searchQ)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[85vh] max-h-[800px] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {view !== 'select' && (
              <button onClick={goBack} className="p-1 hover:bg-gray-100 rounded shrink-0">
                <ArrowLeft size={16} className="text-gray-500" />
              </button>
            )}
            <h2 className="text-base font-bold text-gray-900 truncate">
              {view === 'select' ? '희망 배달 권역 선택'
                : view === 'subregion' ? `${selectedRegion} · 시·군·구 선택`
                : view === 'zones' ? `${selectedRegion} ${selectedSubregion ?? ''} 권역`
                : '권역 검색'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded shrink-0">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* 검색 input — select/search view 모두에서 보이게 sticky */}
        {(view === 'select' || view === 'search') && (
          <div className="px-5 py-3 border-b border-gray-100 shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQ}
                onChange={(e) => onSearchInput(e.target.value)}
                onCompositionStart={() => { composingRef.current = true }}
                onCompositionEnd={(e) => {
                  composingRef.current = false
                  if (debounceRef.current) clearTimeout(debounceRef.current)
                  const v = (e.target as HTMLInputElement).value
                  debounceRef.current = setTimeout(() => doSearch(v), 700)
                }}
                onKeyDown={onSearchKeyDown}
                placeholder="지역명으로 검색 후 Enter (예: 강남, 부천)"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {view === 'select' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* 도움말 */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 flex gap-2">
                <Info size={14} className="shrink-0 mt-0.5 text-gray-400" />
                <div>
                  <p className="font-semibold text-gray-700 mb-1">권역이란?</p>
                  <p>배민커넥트비즈의 배달 서비스 운영 단위입니다. 지역(시/군/구) 하나가 여러 권역(A, B, C)으로 나뉘기도 합니다. 협력사는 지정된 권역 내에서만 배달을 수행합니다.</p>
                  <p className="mt-1.5 text-gray-500">신청 후에도 담당자 협의를 통해 변경할 수 있습니다.</p>
                </div>
              </div>

              {/* 지역 그리드 */}
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2">또는 지역을 먼저 선택</div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {regions.map(r => (
                    <button
                      key={r.rgn1}
                      type="button"
                      onClick={() => handleRegion(r.rgn1)}
                      className="px-3 py-3 text-sm border border-gray-200 rounded-lg bg-white hover:border-emerald-400 hover:bg-emerald-50 transition-colors text-left"
                    >
                      <div className="font-semibold text-gray-900">
                        {r.rgn1.replace(/(특별시|광역시|특별자치시|도|특별자치도)/g, '')}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{r.zone_count}개 권역</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 범례 */}
              <div className="pt-2 border-t border-gray-100">
                <div className="text-xs font-semibold text-gray-500 mb-2">지역구분 안내</div>
                <div className="space-y-1.5">
                  {(['집중', '관찰', '안정'] as const).map(rc => {
                    const color = rc === '집중' ? 'red' : rc === '관찰' ? 'amber' : 'emerald'
                    const c = COLOR_STYLES[color]!
                    const desc = rc === '집중' ? '주문이 매우 많고 공급 확대가 필요한 지역'
                      : rc === '관찰' ? '주문량 보통, 안정적인 권역'
                      : '주문이 안정적이며 신규 협력사 여유 있음'
                    return (
                      <div key={rc} className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.badge} shrink-0 w-10 text-center`}>{rc}</span>
                        <span className="text-[11px] text-gray-600">{desc}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 시군구 선택 단계 */}
          {view === 'subregion' && (
            loading ? (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400">불러오는 중...</div>
            ) : (
              <>
                {selectedRegion && groups.length > 0 && (
                  <div className="shrink-0 px-5 pt-5">
                    <ZoneMap
                      rgn1={selectedRegion}
                      groups={groups}
                      hoveredRgn2={hoveredRgn2}
                      onRgn2Click={(rgn2) => handleSubregion(rgn2)}
                    />
                  </div>
                )}
                <div className="flex-1 overflow-y-auto px-5 pt-4 pb-5">
                  <div className="text-xs text-gray-500 mb-3">{groups.length}개 시·군·구 · 시군구를 선택하세요</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {groups.map(g => {
                      const count = g.zones.filter(z => z.id !== excludeId).length
                      return (
                        <button
                          key={g.rgn2}
                          type="button"
                          onClick={() => handleSubregion(g.rgn2)}
                          onMouseEnter={() => setHoveredRgn2(g.rgn2)}
                          onMouseLeave={() => setHoveredRgn2(null)}
                          disabled={count === 0}
                          className="px-3 py-2.5 text-left border border-gray-200 rounded-lg bg-white hover:border-emerald-400 hover:bg-emerald-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <div className="font-semibold text-gray-900 text-sm">{g.rgn2}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">{count}개 권역</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )
          )}

          {/* 권역 카드 단계 (단일 rgn2) */}
          {view === 'zones' && (() => {
            const targetGroups = selectedSubregion
              ? groups.filter(g => g.rgn2 === selectedSubregion)
              : groups
            const allZones = targetGroups.flatMap(g => g.zones.filter(z => z.id !== excludeId))
            return loading ? (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400">불러오는 중...</div>
            ) : (
              <>
                {selectedRegion && targetGroups.length > 0 && (
                  <div className="shrink-0 px-5 pt-5">
                    <ZoneMap
                      rgn1={selectedRegion}
                      groups={targetGroups}
                      hoveredRgn2={hoveredRgn2}
                      onRgn2Click={(rgn2) => handleSubregion(rgn2)}
                    />
                  </div>
                )}
                <div className="flex-1 overflow-y-auto px-5 pt-4 pb-5 space-y-2.5">
                  <div className="text-xs text-gray-500 mb-1">{allZones.length}개 권역</div>
                  {allZones.map(z => (
                    <ZoneCard key={z.id} zone={z} onSelect={() => onSelect(z)} />
                  ))}
                  {allZones.length === 0 && (
                    <div className="text-center py-8 text-sm text-gray-400">선택 가능한 권역이 없습니다</div>
                  )}
                </div>
              </>
            )
          })()}

          {view === 'search' && (
            <SearchResultsView
              searchQ={searchQ}
              searching={searching}
              lastQuery={lastQuery}
              searchResults={searchResults}
              excludeId={excludeId}
              onSelect={onSelect}
              onOpenRegion={(rgn1) => { setSearchQ(''); handleRegion(rgn1) }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ── 검색 결과 뷰 (지도 + rgn2별 그룹화 + 시도 단위 검색 안내) ──
function SearchResultsView({ searchQ, searching, lastQuery, searchResults, excludeId, onSelect, onOpenRegion }: {
  searchQ: string
  searching: boolean
  lastQuery: string | null
  searchResults: EnrichedZone[]
  excludeId?: string
  onSelect: (z: EnrichedZone) => void
  onOpenRegion: (rgn1: string) => void
}) {
  // rgn1+rgn2별 그룹화 (지도용 + 리스트용 공통)
  const groups = (() => {
    const map = new Map<string, { rgn1: string; rgn2: string; zones: EnrichedZone[] }>()
    for (const z of searchResults) {
      if (z.id === excludeId) continue
      const key = `${z.rgn1}__${z.rgn2}`
      if (!map.has(key)) map.set(key, { rgn1: z.rgn1, rgn2: z.rgn2, zones: [] })
      map.get(key)!.zones.push(z)
    }
    return Array.from(map.values())
  })()

  const distinctRgn1 = Array.from(new Set(searchResults.map(z => z.rgn1)))
  const isWholeRegionMatch = distinctRgn1.length === 1 && groups.length >= 3

  if (searchQ.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-sm text-gray-400">지역명을 입력해주세요</div>
  }
  if (searching) {
    return <div className="flex-1 flex items-center justify-center text-sm text-gray-400">검색 중...</div>
  }
  if (lastQuery !== searchQ) {
    return <div className="flex-1 flex items-center justify-center text-xs text-gray-300">입력 중... <span className="ml-1 text-gray-400">(Enter로 즉시 검색)</span></div>
  }
  if (searchResults.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-sm text-gray-400">
        "{searchQ}" 검색 결과가 없습니다
        <div className="text-[11px] text-gray-400 mt-1">시·군·구 단위로 입력해보세요 (예: 강남, 부천, 용인기흥)</div>
      </div>
    )
  }

  const totalCount = groups.reduce((s, g) => s + g.zones.length, 0)

  return (
    <>
      {/* 고정 지도 — 결과 영역과 동일 padding scale */}
      {groups.length > 0 && (
        <div className="shrink-0 px-5 pt-5">
          <ZoneMap
            groups={groups}
            onRgn2Click={(rgn2, rgn1) => {
              if (rgn1) onOpenRegion(rgn1)
            }}
          />
        </div>
      )}
      {/* 스크롤 카드 영역 */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-5 space-y-4">
        <div className="flex items-center justify-between text-[11px]">
          <div className="text-gray-500">
            <strong className="text-gray-700">{totalCount}개 권역</strong> · {groups.length}개 시·군·구
          </div>
          {isWholeRegionMatch && (
            <button
              type="button"
              onClick={() => onOpenRegion(distinctRgn1[0]!)}
              className="text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              {distinctRgn1[0]} 전체 보기 →
            </button>
          )}
        </div>

        {isWholeRegionMatch && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-[11px] text-blue-700 flex gap-2">
            <Info size={12} className="shrink-0 mt-0.5" />
            <div>
              <strong>{distinctRgn1[0]}</strong> 전체 권역입니다. 더 정확하게는 시·군·구를 함께 입력해보세요 (예: "{distinctRgn1[0]!.replace(/(특별시|광역시|특별자치시|도|특별자치도)/g, '')} 부천")
            </div>
          </div>
        )}

        {groups.map(g => (
          <div key={`${g.rgn1}__${g.rgn2}`}>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-baseline gap-1.5">
              <span className="text-gray-400 text-[11px] font-normal">{g.rgn1.replace(/(특별시|광역시|특별자치시|도|특별자치도)/g, '')}</span>
              {g.rgn2}
              <span className="text-[11px] text-gray-400 font-normal">· {g.zones.length}개 권역</span>
            </h3>
            <div className="space-y-2.5">
              {g.zones.map(z => (
                <ZoneCard key={z.id} zone={z} onSelect={() => onSelect(z)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function ZoneCard({ zone, onSelect, showRgn2 }: { zone: EnrichedZone; onSelect: () => void; showRgn2?: boolean }) {
  const c = COLOR_STYLES[zone.region_class_color] ?? COLOR_STYLES.gray!

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-lg border-2 ${c.border} ${c.bg} p-3 hover:shadow-md transition-shadow`}
    >
      {/* 상단 뱃지 + 권역명 */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.badge}`}>
          {zone.region_class_label}
        </span>
        <span className="font-bold text-gray-900">
          {showRgn2 && <span className="text-gray-500 mr-1">{zone.rgn1.replace(/(특별시|광역시|특별자치시|도|특별자치도)/g, '')} {zone.rgn2}</span>}
          {zone.zone_code}
        </span>
        {zone.set_cap_warning && (
          <span className="text-[10px] font-bold text-red-600 border border-red-300 px-1.5 py-0.5 rounded bg-white">⚠ Set Cap</span>
        )}
        {zone.direct_slot_full && (
          <span className="text-[10px] font-bold text-orange-600 border border-orange-300 px-1.5 py-0.5 rounded bg-white">직계약 1곳 이미 있음</span>
        )}
      </div>

      {/* 지역구분 설명 */}
      <p className={`text-[11px] ${c.text} mb-2`}>{zone.region_class_desc}</p>

      {/* 정보 3가지 */}
      <div className="grid grid-cols-3 gap-2 text-[11px] pt-2 border-t border-white/70">
        <div>
          <div className="text-gray-500 flex items-center gap-1"><MapPin size={10} /> 요금제</div>
          <div className="font-semibold text-gray-800 mt-0.5">{zone.pricing_plan ?? '-'}</div>
        </div>
        <div>
          <div className="text-gray-500 flex items-center gap-1"><TrendingUp size={10} /> 예상 수익/주</div>
          <div className="font-semibold text-gray-800 mt-0.5">
            {formatMan(zone.estimated_weekly_revenue.min)}~{formatMan(zone.estimated_weekly_revenue.max)}원
          </div>
        </div>
        <div>
          <div className="text-gray-500 flex items-center gap-1"><Users size={10} /> 운영 중</div>
          <div className="font-semibold text-gray-800 mt-0.5">
            {zone.active_partners}곳 <span className="text-gray-400 font-normal">({zone.direct_partners}/{zone.broker_partners})</span>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end text-[11px] text-emerald-600 font-semibold">
        <CheckCircle size={11} className="mr-0.5" /> 이 권역 선택하기
      </div>
    </button>
  )
}
