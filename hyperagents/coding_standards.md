# Coding Standards — 좋은 코드란 무엇인가

> **엄격한 아카이빙 규칙**: 사용자가 긍정 피드백을 준 코드 또는 3회 이상 재사용된 패턴만 여기 추가. 추측/선호로 추가 금지.

---

## Rob Pike의 5대 규칙

> 출처: [Notes on Programming in C (Rob Pike)](https://www.cs.unc.edu/~stotts/COMP590-059-f24/robsrules.html)

에이전트는 코드 작성 시 이 규칙을 **기본 자세**로 유지한다.

### 규칙 1: 병목은 예측할 수 없다
프로그램이 어디서 시간을 소비할지 예측할 수 없다. 병목은 예상치 못한 곳에서 발생하므로, **실제로 병목임이 입증되기 전까지 속도 개선 시도 금지**.

### 규칙 2: 측정이 우선
속도 조정은 측정 후에만 수행한다. 코드의 한 부분이 전체를 압도할 때만 최적화를 고려한다.

### 규칙 3: 단순한 알고리듬이 먼저
복잡한 알고리듬은 큰 상수를 가지며 작은 n에서 느리다. **n이 자주 커지지 않는 한 단순한 방법을 사용**한다. n이 커지더라도 먼저 규칙 2를 적용해야 한다.

### 규칙 4: 단순한 데이터 구조를 사용하라
복잡한 알고리듬은 버그가 많고 구현이 어렵다. 단순한 알고리듬과 **단순한 데이터 구조**를 사용하는 것이 바람직하다.

### 규칙 5: 데이터가 핵심이다
올바른 데이터 구조를 선택하고 잘 조직하면, 알고리듬은 거의 자명하게 드러난다. **프로그래밍의 중심은 알고리듬이 아니라 데이터 구조**이다.

**이 프로젝트에서의 적용**:
- 성능 최적화보다 **가독성과 정확성** 우선
- "더 빠른 방법이 있지 않을까?" 보다 "이 데이터 구조가 문제를 올바르게 표현하는가?"
- 복잡한 캐싱/메모이제이션은 측정으로 병목이 입증된 후에만

---

## Kent Beck의 TDD + Tidy First 원칙

> 출처: [Kent Beck — BPlusTree3 CLAUDE.md](https://github.com/KentBeck/BPlusTree3/blob/main/rust/docs/CLAUDE.md)

### TDD 사이클: Red → Green → Refactor

1. **Red**: 실패하는 테스트를 먼저 작성 (작은 기능 증분 정의)
2. **Green**: 테스트를 통과시키는 **최소한의 코드**만 작성 — no more
3. **Refactor**: 테스트 통과 후 구조 개선 (중복 제거, 명확성 향상)

```
새 기능 접근 시:
1. 기능의 작은 부분에 대한 실패 테스트 작성
2. 통과시키는 최소 구현
3. 테스트 통과 확인 (Green)
4. 필요한 구조적 변경 (Tidy First) — 각 변경 후 테스트
5. 구조적 변경 커밋 (별도)
6. 다음 증분에 대한 테스트 추가
7. 기능 완성까지 반복, 행동 변경과 구조 변경을 별도 커밋
```

### Tidy First — 구조와 행동을 분리하라

모든 변경을 두 유형으로 엄격히 구분:
1. **구조적 변경 (Structural)**: 코드 재배치, 리네이밍, 메서드 추출 — 행동은 바뀌지 않음
2. **행동 변경 (Behavioral)**: 실제 기능 추가/수정

- 두 유형을 **같은 커밋에 섞지 않는다**
- 둘 다 필요하면 **구조적 변경을 먼저** 수행
- 구조적 변경 후 테스트를 돌려 행동이 바뀌지 않았음을 검증

### 코드 품질 기준

- 중복을 가차 없이 제거
- 이름과 구조를 통해 의도를 명확히 표현
- 의존성을 명시적으로
- 메서드를 작게, 단일 책임으로
- 상태와 부작용 최소화
- **동작할 수 있는 가장 단순한 해법** 사용

### 결함 수정 시

1. 먼저 API 수준의 실패 테스트 작성
2. 문제를 재현하는 가능한 가장 작은 테스트 작성
3. 두 테스트 모두 통과시키기

### 커밋 규칙

- 모든 테스트 통과
- 모든 경고 해결
- 단일 논리 단위
- 커밋 메시지에 구조적/행동 변경 구분 명시
- 크고 드문 커밋보다 **작고 빈번한 커밋**

**이 프로젝트에서의 적용**:
- `bash hyperagents/scripts/check.sh` = Green 확인 (TS + build)
- Tidy First = 기능 추가 전 기존 코드 정리 먼저 (별도 커밋)
- 결함 수정 시 근본 원인 테스트 → 수정 → `best_practices.md` 반영

---

## 이 프로젝트 기술 스택 원칙

- React 19 + Vite + TypeScript + Tailwind CSS v4
- 함수형 컴포넌트만 사용, class 컴포넌트 X
- Hook 순서: `useState` → `useRef` → `useEffect` → 함수 정의 → JSX return
- 외부 라이브러리 최소화 (이미 있는 것 최대 활용)
- Server: Hono + better-sqlite3
- 공통 utility: `src/lib/`

## UI 패턴

### 모달 구조 (검증됨 — ZoneSelector)

```tsx
<div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
  <div className="absolute inset-0 bg-black/50" />
  <div
    className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[85vh] max-h-[800px] overflow-hidden flex flex-col"
    onClick={(e) => e.stopPropagation()}
  >
    {/* Header (shrink-0) */}
    {/* Fixed region (shrink-0, 선택사항) */}
    {/* Scrollable body (flex-1 overflow-y-auto) */}
  </div>
</div>
```

**포인트**:
- `h-[85vh] max-h-[800px]` — 컨텐츠 양과 무관하게 일정 크기
- ESC 키 닫기: `window.addEventListener('keydown', ...)` 별도 useEffect
- 바깥 클릭 닫기: 배경 div `onClick={onClose}` + 본체 `onClick={(e) => e.stopPropagation()}`

### Tailwind spacing scale (ZoneSelector 모달 내부)

| 영역 | className |
|---|---|
| 모달 body 외곽 padding | `px-5 pt-5` / `px-5 pt-4 pb-5` |
| 카드 사이 | `space-y-2.5` |
| 그룹 사이 | `space-y-4` |
| 그룹 헤더 ↔ 카드 | `mb-3` |

**근거**: `docs/design/design_20260413_zone_selector_spacing.md`

### 폼 input 재사용 컴포넌트 (PortalApply)

`SectionHeader` / `Field` / `TextInput` / `Select` — 중복 줄이고 일관성 확보.

```tsx
<SectionHeader title="..." hint="..." required />
<Field label="..." required>
  <TextInput value={...} onChange={...} placeholder="..." />
</Field>
```

## Hono + SQLite 쿼리 패턴

```ts
const rows = db.prepare('SELECT * FROM zones WHERE ... ').all(...params) as Array<Record<string, unknown>>
```

- parameterized query 필수 (SQL injection 방지)
- `as` 캐스팅은 최소화. 가능하면 별도 타입 정의.

## 비동기 action + debounce (ZoneSelector:검색)

IME 처리 + debounce + Enter 즉시 실행 — `best_practices.md` 의 "한글 IME 입력 처리" 참조.

## 금지 패턴 (이 프로젝트에서 확인된 문제)

- ❌ `useEffect` 의존성에 인라인 함수 전달 → 무한 재실행
- ❌ `max-h-[Xvh]` 만으로 모달 크기 고정 (min-height 효과 없음) → `h-[Xvh]` 사용
- ❌ public API 응답 body 중 민감 정보 그대로 노출 (서버 필터링)
- ❌ IME 조합 상태 무시하고 `onChange` 매번 액션 트리거

## 아카이브 예시 섹션 (append-only)

### 2026-04-13 — 국세청 API 키 이중 인코딩 fix

```ts
// src/server/integrations/nts.ts
async function callNtsApi(bizNum: string, apiKey: string) {
  const decoded = decodeURIComponent(apiKey)
  const url = `https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${encodeURIComponent(decoded)}`
  // ...
}
```

**왜 아카이브**: 공공데이터포털 API 키 공통 문제. 다른 공공 API 통합 시 재사용 가능.

### 2026-04-13 — Kakao SDK 동적 로더 + Geocoder 캐시

```ts
// src/lib/kakao-map.ts — loadPromise = null reset on failure + localStorage cache
```

**왜 아카이브**: 외부 SDK 로드 실패 시 재시도 가능 + 주소→좌표 변환 비용 절감.

---

## (추가 아카이브는 아래에 append)
