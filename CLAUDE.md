# 3PL Project — HyperAgents Harness

> 이 프로젝트는 Meta/UBC의 **HyperAgents 패턴** (2026) 을 채택한다. 에이전트는 단순히 작업을 수행하는 것을 넘어, **자신의 작업 환경(하네스)을 스스로 진화시킨다**.
>
> 이전에 운영하던 "Agentic Team" (Lead/Sage/Chronicle 등 12 페르소나) 은 **폐지**되었다. 각 페르소나의 역할·산출물 포맷은 hyperagents 체계에 녹아들었다. 과거 기록 (`docs/chronicle/`) 은 아카이브로 보존한다.

---

## Common Rules

- 에이전트는 한국어로 사용자와 소통한다.
- 정보 전달 및 협업 맥락은 반드시 `docs/` 디렉토리의 마크다운 문서를 통해 이루어진다.
- 산출물은 **용도별 경로** (`docs/sources/`, `docs/prd/`, `docs/reviews/` 등) 에 저장한다. 페르소나 라벨 (`@PRD`, `@Dev` 등) 은 사용하지 않는다.
- 에이전트는 사용자와 **직접 소통**한다. 페르소나 전환 없이 상황에 따라 필요한 모드 (Task / Meta / Review) 로 전환한다.
- 모든 세션은 **Retrospective Review** 로 종료한다 (`hyperagents/logs/`).

---

## HyperAgents Workflow

### 3-Layer 아키텍처

| 층 | 경로 | 역할 | 변경 주체 |
|---|---|---|---|
| Artifacts | `docs/` | 협업 산출물 (PRD/Design/Data/Security/QA/Domain 등) — **무엇을** 만들지 | Task Agent |
| HyperAgents | `hyperagents/` | 하네스 인프라 (스크립트/패턴/로그/진화) — **어떻게** 더 잘 만들지 | Meta Agent (자기수정) |
| Auto Memory | `~/.claude/memory/` | 사용자 프로필·피드백 — **누구를** 위해 | 사용자 대화 기반 |

### 에이전트가 반드시 지킬 원칙

1. **작업 시작 전 (Pre-flight)**:
   - 현재 태스크와 관련된 `hyperagents/best_practices.md` 섹션 확인
   - 최근 `hyperagents/logs/` 2-3 개 훑기
   - 비자명/모호/중요 요청이면 `hyperagents/review_protocols.md` 의 **Pre-flight Review** 수행
   - 세부 규범: `hyperagents/CLAUDE.md`

2. **Infrastructure Production** (반복 패턴 → 인프라로 승격):
   - 같은 명령/체크를 **3회 이상** 실행했다면 → `hyperagents/scripts/`
   - 사용자 피드백으로 도출된 재발 방지 규칙 → `hyperagents/best_practices.md` 또는 `coding_standards.md`
   - 사용자가 "좋다"고 확인한 코드 스니펫 → `hyperagents/coding_standards.md` 아카이브

3. **Self-Correction Loop**:
   - 에러/재작업 발생 시 단순 수정에 그치지 말고 `hyperagents/` 의 규칙/도구가 **부재했거나 불충분했는지** 검토
   - 부재/불충분했다면 파일 갱신 + `hyperagents/evolution.md` 에 한 줄 이상 기록

4. **마일스톤 Checkpoint**:
   - 큰 결정 직전/직후, 여러 세션 걸친 작업 중 방향 의심 시 `review_protocols.md` 의 **Checkpoint Review**

5. **세션 종료 (Retrospective)**:
   - `bash hyperagents/scripts/new-log.sh "<topic>"` 로 로그 생성 후 기록
   - 구조적 변경 (새 스크립트·카테고리·CLAUDE.md 갱신) 은 `evolution.md` 반영

6. **검증 자동화**:
   - 코드 수정 후 `bash hyperagents/scripts/check.sh` 로 TS + build 일괄 검증

### Review Protocols (메타인지)

기존 Sage Agent 역할은 **3 개 프로토콜**로 흡수되었다. 상세: `hyperagents/review_protocols.md`.

| 프로토콜 | 언제 | 목적 |
|---|---|---|
| **Pre-flight** | 비자명/모호 요청 시작 전 | 가정 점검·Unknown Unknowns·Reframing·편향 점검 |
| **Checkpoint** | 마일스톤 중간, 드리프트 의심 | 설계 재검증·테스트 공백·스코프 확인 |
| **Retrospective** | 세션 종료 (의무) | 하네스 부재 탐지·패턴 승격·진화 기록 |

**비례 원칙**: 단순 작업엔 간결 모드, 복잡 결정엔 산출물 필수. 전부 매번 돌리지 않는다.

### Meta Agent 모드

기본은 **Task Agent** 모드. 다음 순간 **Meta Agent 모드** 로 전환 (자기수정):
- 사용자가 "팀으로 일해라", "하네스 정리해라" 등 메타 지시
- 같은 실수/요청이 2회 이상 반복
- 세션 종료 시점 (Retrospective Review 의무)
- 구조적 개선 기회 포착

Meta Agent 는 `src/` 를 수정하지 않고 `hyperagents/` + `docs/reviews/` + `docs/questions/` 만 수정한다.

---

## Artifacts (산출물 가이드)

**기존 페르소나 → 문서 유형** 으로 재해석. 포맷·품질 기준 상세는 `hyperagents/artifacts.md` 에 정의.

| 용도 | 경로 | 언제 작성 |
|---|---|---|
| 외부 자료 수집 | `docs/sources/` | 외부 문서를 팀 기준으로 구조화 |
| 제품 요구사항 | `docs/prd/` | 기능 기획 확정 전 명세 |
| 리뷰·대안 분석 | `docs/reviews/` | PRD 리뷰, 기술 비교, Pre-flight/Checkpoint 산출물 |
| UI/UX 설계 | `docs/design/` | 화면·컴포넌트·인터랙션 |
| 데이터 스펙 | `docs/data/` | ERD·스키마·거버넌스·분석 |
| 보안 리뷰 | `docs/security/` | STRIDE·취약점·승인 판단 |
| QA·배포 체크 | `docs/qa/` | 테스트·배포 체크리스트 |
| 도메인 온톨로지 | `docs/domain/` | 3PL Object/Link/Action |
| 사용자 문의 | `docs/questions/` | 응답 대기 중인 의사결정 |
| 세션 로그·레슨런 | `hyperagents/logs/` | **기존 `docs/chronicle/` 역할 이주** |

### 도메인 지식 (특별 언급)

`docs/domain/` 의 **팔란티어식 Object/Link/Action 온톨로지** 는 이 프로젝트의 **지적 자산**이다. 에이전트는:
- 새 정보 입력 시 **어떤 Object/Link/Action 에 해당하는지** 분류 후 보강
- 모든 지식에 **확실도(높음/중간/낮음)** 와 **출처(provenance)** 표기
- 도메인 용어가 코드 (`src/`) 에서 일관되게 사용되는지 점검
- 추후 RAG 챗봇 분리 대비하여 구조화 유지

---

## 작업 흐름 (Workflow)

```
┌─────────────────────────────────────────────────────────┐
│  사용자                                                  │
│    │  자연어 요청                                         │
│    ▼                                                    │
│  [Task Agent]  ←────────────── Pre-flight Review         │
│    │         (비자명/복잡한 요청이면 먼저 수행)               │
│    │                                                    │
│    │  필요한 산출물 생성                                   │
│    ▼                                                    │
│  docs/sources/  docs/prd/  docs/design/  docs/data/     │
│  docs/security/ docs/qa/   docs/domain/ docs/reviews/   │
│    │                                                    │
│    │  주요 결정 시점                                       │
│    ▼                                                    │
│  [Checkpoint Review]  ←──── 필요 시 산출물 docs/reviews/    │
│    │                                                    │
│    │  작업 수행 + src/ 수정                               │
│    ▼                                                    │
│  [검증] bash hyperagents/scripts/check.sh                │
│    │                                                    │
│    │  사용자 피드백                                       │
│    ▼                                                    │
│  [Meta Agent]  ←──── 에러/반복 실수 발생 시                  │
│    │         hyperagents/ 규칙/도구 보강                  │
│    │                                                    │
│    ▼                                                    │
│  [세션 종료 — Retrospective Review]                       │
│    │                                                    │
│    ├─► hyperagents/logs/YYYY-MM-DD-<topic>.md            │
│    ├─► hyperagents/best_practices.md (패턴 승격)           │
│    ├─► hyperagents/coding_standards.md (표본 아카이브)      │
│    └─► hyperagents/evolution.md (구조 변경 기록)           │
└─────────────────────────────────────────────────────────┘
```

---

## How to Invoke (사용자 호출 패턴)

### 기본 사용

사용자는 자연어로 요청한다. 에이전트가 요청을 분석하여 필요한 작업을 수행한다:

```
"이 구글시트를 분석해서 주문 추적 기능 기획하고 구현까지 해줘"
→ docs/sources/ 수집 → docs/data/ 데이터 설계 → docs/prd/ 기획
→ docs/reviews/ 리뷰 → docs/security/ 보안 검토 → src/ 구현 → docs/qa/

"오늘 미팅에서 들은 건데, 3PL에서 크로스도킹이라는 게 있대. [내용]"
→ docs/domain/ 온톨로지 갱신 (Object 추가 or Action 신설)

"지금 우리가 놓치고 있는 게 뭘까?"
→ Pre-flight Review 프로토콜로 가정·Unknown Unknowns 점검
→ docs/reviews/pre_flight_...md (필요 시)
```

### 메타 지시

사용자가 **하네스 자체의 개선**을 원할 때:

```
"팀으로 일해라" / "/effort max"
→ Meta Agent 모드 + 세 리뷰 모두 적용

"하네스를 손봐라" / "스크립트 정리해라"
→ Meta Agent 모드, hyperagents/ 만 수정

"이 패턴 기억해둬"
→ 조건 확인 후 hyperagents/best_practices.md 에 추가
```

### 특정 산출물 직접 요청

사용자는 산출물 유형을 **경로로** 지시할 수 있다:

```
"PRD 써줘" → docs/prd/
"도메인 온톨로지에 추가해줘" → docs/domain/
"이 설계 리뷰해줘" → docs/reviews/
```

페르소나 호출 (`@PRD`, `@Sage` 등) 은 더 이상 사용하지 않는다.

---

## Docs Directory Structure

```
docs/
├── sources/           # 외부 자료 수집/정리
├── data/              # 데이터 스펙 (ERD·스키마·거버넌스)
├── prd/               # 제품 요구사항 문서
├── reviews/           # 리뷰 / Pre-flight / Checkpoint 산출물
├── security/          # 보안 리뷰 (STRIDE·취약점·승인)
├── design/            # UI/UX 설계
├── qa/                # QA 결과 / 배포 체크리스트
├── domain/            # 3PL 온톨로지 (Object/Link/Action)
├── questions/         # 사용자 응답 대기 중
├── plan/              # 장기 플래닝 문서
├── chronicle/         # [ARCHIVE] 과거 세션 로그 (신규 작성 X, 읽기만)
│   ├── logs/          #   과거 타임라인
│   └── lessons/       #   과거 레슨런
└── sources/external/  # 외부 참고 자료 (논문·문서)
```

### hyperagents/ (하네스)

```
hyperagents/
├── README.md              # 전체 개요 + 진화 루프
├── CLAUDE.md              # 폴더 내 메타 지침
├── harness.md             # 6대 구성요소 현재 매핑
├── evolution.md           # 하네스 진화 로그
├── review_protocols.md    # Pre-flight / Checkpoint / Retrospective
├── artifacts.md           # 문서 유형별 산출물 가이드
├── best_practices.md      # 패턴 라이브러리
├── coding_standards.md    # 좋은 코드 표본 아카이브
├── logs/                  # 세션 로그 (Chronicle 대체)
│   ├── INDEX.md
│   └── YYYY-MM-DD-<topic>.md
└── scripts/               # 자동화 도구
    ├── README.md
    ├── check.sh           # TS + build 검증
    └── new-log.sh         # 로그 템플릿 생성
```

---

## 금지 사항

- 페르소나 호출 문법 (`@PRD`, `@Sage`, `@Chronicle` 등) 사용 금지 — 이전 시스템 잔재
- `docs/chronicle/` 에 **신규** 로그/레슨런 작성 금지 — 아카이브, 읽기 전용. 신규는 `hyperagents/logs/` 로
- `src/` 를 Meta Agent 모드에서 수정 금지 (Task Agent 모드로 전환 필요)
- 산출물 경로 임의 변경 금지 — `hyperagents/artifacts.md` 표준 따르기
- 확실도 표기 없이 도메인 지식을 `docs/domain/` 에 추가 금지

---

## Migration Note (2026-04-14)

이전 Agent Team 시스템은 오늘부로 폐지되었다:
- **폐지**: Lead/Sage/Doc/PRD/Consultant/Design/Dev/Data/Security/QA/Domain/Chronicle (12 페르소나)
- **흡수**: Sage → `hyperagents/review_protocols.md`, Chronicle → `hyperagents/logs/` + `evolution.md`
- **재편**: 10 페르소나의 산출물 포맷 → `hyperagents/artifacts.md` 의 문서 유형 체계
- **보존**: `docs/chronicle/` 은 과거 기록으로 유지 (읽기 전용)
- **신규**: Pre-flight / Checkpoint / Retrospective 프로토콜, 메타 개선 루프 공식화

상세 전환 이력: `hyperagents/evolution.md`
