// Kakao Map JavaScript SDK 동적 로더 + Geocoder 캐시
// https://apis.map.kakao.com/web/

declare global {
  interface Window {
    kakao: any
  }
}

let loadPromise: Promise<void> | null = null

export function loadKakaoMap(): Promise<void> {
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('SSR'))
    if (window.kakao?.maps?.services) return resolve()

    const key = import.meta.env.VITE_KAKAO_MAP_JS_KEY
    if (!key) {
      loadPromise = null
      return reject(new Error('VITE_KAKAO_MAP_JS_KEY 미설정 — .env 확인 후 dev 서버 재시작'))
    }

    const fail = (msg: string) => {
      loadPromise = null // 실패 시 재시도 가능하도록
      reject(new Error(msg))
    }

    const onReady = () => {
      if (!window.kakao?.maps) return fail('Kakao SDK 로드됐지만 maps 객체 없음')
      try {
        window.kakao.maps.load(() => resolve())
      } catch (e) {
        fail(`Kakao maps.load 실패: ${e instanceof Error ? e.message : 'unknown'}`)
      }
    }

    const existing = document.getElementById('kakao-map-sdk') as HTMLScriptElement | null
    if (existing) {
      // 이미 로드 완료라면 즉시 onReady, 아니면 load 대기
      if (window.kakao?.maps) onReady()
      else existing.addEventListener('load', onReady, { once: true })
      return
    }

    // https 명시 (mixed content 방지)
    const script = document.createElement('script')
    script.id = 'kakao-map-sdk'
    script.async = true
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false&libraries=services`
    script.addEventListener('load', onReady, { once: true })
    script.addEventListener('error', () => fail(
      'Kakao SDK 로드 실패 — 카카오 콘솔에서 사이트 도메인 (http://localhost:5174) 등록 여부 확인'
    ), { once: true })
    document.head.appendChild(script)
  })

  return loadPromise
}

// ── Geocoder 캐시 (주소 → {lat, lng}) ──
const COORD_CACHE_KEY = 'kakao_geocode_v1'
type CoordCache = Record<string, { lat: number; lng: number } | null>

function readCache(): CoordCache {
  try { return JSON.parse(localStorage.getItem(COORD_CACHE_KEY) ?? '{}') } catch { return {} }
}
function writeCache(cache: CoordCache) {
  try { localStorage.setItem(COORD_CACHE_KEY, JSON.stringify(cache)) } catch { /* quota */ }
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  await loadKakaoMap()
  const cache = readCache()
  if (address in cache) return cache[address]

  return new Promise((resolve) => {
    const geocoder = new window.kakao.maps.services.Geocoder()
    geocoder.addressSearch(address, (results: any[], status: string) => {
      let coord: { lat: number; lng: number } | null = null
      if (status === window.kakao.maps.services.Status.OK && results.length > 0) {
        coord = { lat: parseFloat(results[0].y), lng: parseFloat(results[0].x) }
      }
      cache[address] = coord
      writeCache(cache)
      resolve(coord)
    })
  })
}
