import { useEffect, useRef, useState } from 'react'
import { Loader2, MapPin } from 'lucide-react'
import { loadKakaoMap, geocodeAddress } from '../../lib/kakao-map'
import type { EnrichedZone } from '../../lib/portal-api'

interface Props {
  rgn1?: string // 단일 rgn1 view에서 지도 중심 + 마커 주소 fallback
  groups: Array<{ rgn1?: string; rgn2: string; zones: EnrichedZone[] }>
  hoveredRgn2?: string | null
  onRgn2Click?: (rgn2: string, rgn1?: string) => void
}

const REGION_CLASS_HEX: Record<string, string> = {
  red:     '#dc2626',
  amber:   '#d97706',
  emerald: '#059669',
  gray:    '#6b7280',
}

// rgn2별 대표 region_class (가장 많은 권역의 색)
function dominantColor(zones: EnrichedZone[]): string {
  const count: Record<string, number> = {}
  for (const z of zones) count[z.region_class_color] = (count[z.region_class_color] ?? 0) + 1
  const top = Object.entries(count).sort((a, b) => b[1] - a[1])[0]
  return REGION_CLASS_HEX[top?.[0] ?? 'gray']!
}

export function ZoneMap({ rgn1, groups, hoveredRgn2, onRgn2Click }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // onRgn2Click을 ref로 보관 — useEffect 의존성에서 제외해 무한 재실행 방지
  const onRgn2ClickRef = useRef(onRgn2Click)
  useEffect(() => { onRgn2ClickRef.current = onRgn2Click }, [onRgn2Click])

  // 지도 초기화
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        await loadKakaoMap()
        if (cancelled || !containerRef.current) return

        // 지도 중심: rgn1이 단일이면 그 좌표, 아니면 서울 중심으로 시작 후 bounds.fit
        const seedRgn1 = rgn1 ?? groups[0]?.rgn1
        const center = seedRgn1 ? await geocodeAddress(seedRgn1) : null
        if (cancelled || !containerRef.current) return

        const fallback = { lat: 37.5665, lng: 126.9780 } // 서울 시청
        const c = center ?? fallback

        const isMetro = seedRgn1?.includes('특별시') || seedRgn1?.includes('광역시')

        const map = new window.kakao.maps.Map(containerRef.current, {
          center: new window.kakao.maps.LatLng(c.lat, c.lng),
          level: isMetro ? 8 : 11,
        })
        mapRef.current = map

        // 마커 (병렬 geocoding) — 각 그룹의 rgn1 우선, 없으면 props.rgn1 fallback
        const bounds = new window.kakao.maps.LatLngBounds()
        await Promise.all(groups.map(async (g) => {
          const groupRgn1 = g.rgn1 ?? rgn1
          if (!groupRgn1) return
          const addr = `${groupRgn1} ${g.rgn2}`
          const coord = await geocodeAddress(addr)
          if (cancelled || !coord) return

          const pos = new window.kakao.maps.LatLng(coord.lat, coord.lng)
          bounds.extend(pos)

          const color = dominantColor(g.zones)
          const zoneCount = g.zones.length

          const svg = `<svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z" fill="${color}"/>
            <circle cx="18" cy="18" r="11" fill="white"/>
            <text x="18" y="22" font-family="system-ui" font-size="11" font-weight="bold" text-anchor="middle" fill="${color}">${zoneCount}</text>
          </svg>`
          const imageSrc = `data:image/svg+xml;base64,${btoa(svg)}`
          const markerImage = new window.kakao.maps.MarkerImage(
            imageSrc,
            new window.kakao.maps.Size(36, 44),
            { offset: new window.kakao.maps.Point(18, 44) }
          )

          const marker = new window.kakao.maps.Marker({ position: pos, image: markerImage, map })

          const iwLabel = g.rgn1 ? `${g.rgn1.replace(/(특별시|광역시|특별자치시|도|특별자치도)/g, '')} ${g.rgn2}` : g.rgn2
          const iwContent = `<div style="padding:6px 10px;font-size:12px;font-weight:600;color:#111">${iwLabel} <span style="color:#9ca3af;font-weight:400">· ${zoneCount}개 권역</span></div>`
          const infoWindow = new window.kakao.maps.InfoWindow({ content: iwContent, removable: false })

          window.kakao.maps.event.addListener(marker, 'click', () => onRgn2ClickRef.current?.(g.rgn2, g.rgn1))
          window.kakao.maps.event.addListener(marker, 'mouseover', () => infoWindow.open(map, marker))
          window.kakao.maps.event.addListener(marker, 'mouseout', () => infoWindow.close())

          markersRef.current.set(g.rgn2, { marker, infoWindow })
        }))

        if (!cancelled && !bounds.isEmpty()) map.setBounds(bounds)
        if (!cancelled) setLoading(false)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '지도 로드 실패')
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
      markersRef.current.forEach(({ marker, infoWindow }) => {
        marker?.setMap(null)
        infoWindow?.close()
      })
      markersRef.current.clear()
    }
  }, [rgn1, groups])

  // hover 동기화 — 카드 hover → 해당 마커 인포윈도우 열기
  useEffect(() => {
    if (!mapRef.current || !hoveredRgn2) return
    const entry = markersRef.current.get(hoveredRgn2)
    if (entry) {
      entry.infoWindow.open(mapRef.current, entry.marker)
      mapRef.current.panTo(entry.marker.getPosition())
    }
    return () => { entry?.infoWindow.close() }
  }, [hoveredRgn2])

  return (
    <div className="relative w-full h-64 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
      <div ref={containerRef} className="absolute inset-0" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Loader2 size={14} className="animate-spin" /> 지도 불러오는 중...
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="flex items-center gap-1.5 text-xs text-red-600">
            <MapPin size={14} /> {error}
          </div>
        </div>
      )}
    </div>
  )
}
