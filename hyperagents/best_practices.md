# Best Practices — 이 프로젝트 작업 패턴 라이브러리

> 에이전트가 작업 중 발견한 **반복 가능한 패턴**의 영속 저장소. 새 패턴은 `## 패턴: ...` 형식으로 추가. 오래된 패턴이 쓸모 없어지면 삭제가 아니라 `### DEPRECATED` 표시 후 이유 기록.

---

## 패턴: 한글 IME 입력 처리

**적용**: React에서 한글 입력 받는 input/textarea에 디바운스·자동 검색·실시간 검증 등을 붙일 때.

**핵심**:
- `onChange`는 IME 조합 중에도 매번 발화 (자모 단위)
- `onCompositionStart` / `onCompositionEnd` 로 조합 상태 추적 필수
- 완성되지 않은 자모 (ㅇ, ㅏ 등)는 검색/검증 대상 제외

**표준 구현** (`src/components/portal/ZoneSelector.tsx:handleSearch`):
```tsx
const composingRef = useRef(false)

<input
  onChange={(e) => onInput(e.target.value)}
  onCompositionStart={() => { composingRef.current = true }}
  onCompositionEnd={(e) => {
    composingRef.current = false
    // 조합 끝난 시점부터 디바운스 재시작
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doAction(e.target.value), DELAY)
  }}
/>

function onInput(v: string) {
  // ...
  if (composingRef.current) return // IME 조합 중엔 액션 보류
  debounceRef.current = setTimeout(() => doAction(v), DELAY)
}
```

**왜**: `onChange`만으로는 조합 중 자모가 그대로 action에 흘러들어가 노이즈 발생. 과거 사례: 검색창에 "ㅇ" 입력만으로 "검색 결과 없음" 표시됨.

**참고 세션**: `hyperagents/logs/` 에서 "ime" 검색.

---

## 패턴: Status vs In-Progress 상태 구분

**적용**: 비동기 action의 결과 화면에서 "한 번도 실행 안 됨" vs "실행 후 빈 결과"를 구분해야 할 때.

**핵심**:
- `result.length === 0` 만 보면 두 상태를 구분 불가
- `lastActionKey` state를 두고 "액션이 끝난 마지막 입력"을 기록
- UI 조건: `lastActionKey !== currentInput` → 아직 action 미실행 상태

**표준 구현**:
```tsx
const [lastQuery, setLastQuery] = useState<string | null>(null)

const doSearch = async (q: string) => {
  setSearching(true)
  const r = await api.search(q)
  setResults(r)
  setLastQuery(q)  // 실제로 검색이 끝난 쿼리만 기록
  setSearching(false)
}

// UI
{searching ? '검색 중...'
  : lastQuery !== currentQ ? '입력 중...'
  : results.length === 0 ? '결과 없음'
  : <Results />}
```

**왜**: 초기값 `[]` 를 "빈 결과"로 오인하면 사용자가 "검색 안 했는데 왜 결과 없다고 하지?"라고 혼동.

---

## 패턴: useEffect 의존성에서 인라인 함수 제거

**적용**: 외부 SDK 초기화·마커 그리기·비용 큰 setup이 `useEffect` 안에 있을 때.

**핵심**:
- 콜백 prop이 매 렌더링마다 새 reference → useEffect 무한 재실행
- `useRef` + 업데이트 effect 패턴으로 분리
- 또는 부모에서 `useCallback`으로 안정화

**표준 구현**:
```tsx
// 자식 컴포넌트
const onClickRef = useRef(onClick)
useEffect(() => { onClickRef.current = onClick }, [onClick])

useEffect(() => {
  // ... 비용 큰 setup
  marker.addEventListener('click', () => onClickRef.current?.(id))
  // ...
}, [/* onClick 제외 */ stableProps])
```

**왜**: 과거 사례 — ZoneMap에서 onRgn2Click 인라인 함수로 전달 → hoveredRgn2 변경 시마다 지도 재로드 + 마커 재생성 무한 반복.

---

## 패턴: 모달 내부 layout — sticky 영역과 스크롤 영역 분리

**적용**: 모달 안에 고정 요소(지도·헤더)와 스크롤 요소(카드 리스트)가 공존할 때.

**핵심**:
- 모달 본체: `flex flex-col h-[85vh] max-h-[800px] overflow-hidden`
- 고정 영역: `shrink-0`
- 스크롤 영역: `flex-1 overflow-y-auto`
- 모달 본체는 **컨텐츠 양과 무관하게 일정한 높이** 유지 (min-height 효과)

**WHY `h-[85vh]` 대신 `max-h-[90vh]`는 부족한가**:
- `max-h`는 **최대치만** 제한. 컨텐츠가 적으면 컨테이너도 작아짐.
- 검색 input만 있는 빈 상태에서 모달이 줄어들어 사용자에게 어색함.

**참고**: `src/components/portal/ZoneSelector.tsx:ZoneSelectorModal` 구조.

---

## 패턴: Sticky 헤더보다 단계 분리

**적용**: 리스트 그룹화가 여러 단계로 깊어질 때 (시도 → 시군구 → 권역).

**핵심**:
- Sticky 헤더(`sticky top-0`)가 3단계 이상 겹치면 시각적 어글리.
- 대신 **view 상태**(`'select' | 'subregion' | 'zones'`)로 단계 분리.
- 각 view는 단일 레벨 리스트만 표시 → sticky 헤더 불필요.

**참고**: `src/components/portal/ZoneSelector.tsx` (2026-04-13 리팩토링).

---

## 패턴: 외부 API 키 — URL 인코딩 주의

**적용**: 공공데이터포털(data.go.kr) / Kakao 등 외부 API 사용 시.

**핵심**:
- 공공데이터포털 키는 이미 URL 인코딩된 상태로 발급됨 (`%2B`, `%2F` 포함)
- `encodeURIComponent`로 한 번 더 감싸면 이중 인코딩 → "등록되지 않은 인증키" 오류
- 표준: `decodeURIComponent(envKey)` → 정규화 → `encodeURIComponent` 로 **한 번만**

**Kakao Map**:
- JavaScript 키는 `dapi.kakao.com` script tag에 그대로 삽입
- 도메인 등록 필수 (Kakao 콘솔 → 플랫폼 → Web → 사이트 도메인)
- 미등록 시 브라우저 `script.onerror` 발화

---

## 패턴: Vite dev 서버 포트 고정

**적용**: Kakao / Google 등 외부 SDK가 도메인 화이트리스트 기반 인증 시.

**핵심**:
- `vite.config.ts` 에 `server.port: 5174, strictPort: true` 지정
- `strictPort: true` 로 fallback(+1) 방지 → 도메인 미스매치 차단

**왜**: 이전 세션에서 포트가 5173↔5174 사이 왔다갔다 하며 Kakao SDK 401 발생.

---

## 패턴: npm 스크립트 — dev vs dev:all

**적용**: 백엔드 + 프론트엔드 함께 띄울 때.

**핵심**:
- `npm run dev` — Vite만 (server 따로 띄워야 함)
- `npm run dev:all` — concurrently로 server + vite 동시 watch
- `npm run server` — tsx --watch 모드 (server만)

**함정**: `tsx src/server/index.ts` 로 직접 실행하면 watch 없음 → zones.ts 수정이 반영 안 됨. 반드시 `npm run server` 또는 `dev:all`.

---

## 패턴: Agentic Team 워크플로우

**적용**: 여러 도메인이 섞인 작업 또는 사용자가 "팀으로 일해라"라고 지시할 때.

**핵심**:
- Lead Agent → Sage 사전 검토 → 전문 에이전트 위임 → 종합 보고
- 각 에이전트 산출물은 `docs/{sources,data,prd,reviews,security,design,qa,domain,chronicle}/` 에 마크다운
- 단순 작업엔 오버헤드 크니 비례 원칙 — "Design Agent 페르소나로 직접 처리 + docs/design/에 노트" 정도로 축소 가능

**참고**: 루트 `CLAUDE.md` 의 "Agent Definitions".

---

## 패턴: 두 프로젝트 디렉토리 구분 (헷갈리기 쉬움)

**적용**: 항상. 파일 수정·커밋·위키 업데이트 시 **어느 프로젝트인지** 먼저 확인.

**구조**:

| 디렉토리 | 범위 | GitHub repo | Wiki (Confluence) |
|---|---|---|---|
| `/Users/hm.kim/PRJ/3pl/` | 프로젝트 **전체** — 수행방법, 하네스, 도메인 지식 | `hyeonmini-woowayouths/agentic_work_flow` | 개인 스페이스 > Agentic 업무 플로우 (pageId: `1056213164`) |
| `/Users/hm.kim/PRJ/3pl_b2b_dashboard/` | **대시보드 Mini SaaS** 구축만 | `hyeonmini-woowayouths/3pl_b2b_dashboard` | 3PLOPERATION > 26.04 WIP (pageId: `1069455116`) |

**관계**: `3pl/` 이 상위, `3pl_b2b_dashboard/` 는 서브 프로젝트. CLAUDE.md 는 mirror. `3pl/hyperagents` → symlink.

**왜 중요**: 사용자가 "위키에 남기자"라고 하면 **어느 위키**인지에 따라 pageId·spaceId·OAuth 토큰이 다름. 잘못된 곳에 쓰면 안 됨.

**Confluence OAuth 토큰 위치**: `3pl/docs/sources/confluence/PERSONAL/.env.{read,write}`
**API base**: `https://api.atlassian.com/ex/confluence/7553cfaa-fa16-484f-87f8-6c9b7f448d77/wiki/api/v2`

---

## (추가 패턴은 아래에 append)
