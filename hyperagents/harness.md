# Harness Map — 6대 구성요소 현재 상태

> HyperAgents 논문의 **6가지 하네스 구성요소**가 이 프로젝트에서 어떻게 구현되어 있는지 매핑. 진화할수록 "Custom (hyperagents/)" 항목이 늘어납니다.

## 1. Tool Integration

| 제공 | 구현 | 비고 |
|---|---|---|
| Claude Code 내장 | Bash / Read / Edit / Grep / Glob / Write / Task* | 기본 도구 |
| Shell scripts | `hyperagents/scripts/check.sh` 등 | 확장 가능 |
| MCP | Atlassian / Figma (필요 시) | 설정됨 |
| CLI | `npm run dev:all` / `npm run server` | package.json |

**개선 여지**: 자주 쓰는 조합 (TS check + build + 로그 분석)을 `scripts/`로 승격.

## 2. Memory & State

| 제공 | 구현 | 영구성 |
|---|---|---|
| Auto Memory | `~/.claude/memory/` | 세션 간 영구 (사용자 프로필·피드백) |
| Chronicle Logs | `docs/chronicle/logs/` | 세션별 타임라인 (프로젝트 자산) |
| Lessons Learned | `docs/chronicle/lessons/` | 누적 레슨런 (에이전트 팀 전체) |
| HyperAgents Logs | `hyperagents/logs/` | 하네스 중심 세션 기록 |
| Best Practices | `hyperagents/best_practices.md` | 패턴 라이브러리 (진화형) |
| Coding Standards | `hyperagents/coding_standards.md` | 코드 표본 아카이브 |

**개선 여지**: `best_practices.md`의 카테고리를 늘리고, 패턴별 "왜"를 강화.

## 3. Context Engineering

| 제공 | 구현 | 자동 로드 |
|---|---|---|
| Root 지침 | `CLAUDE.md` (agent team + HyperAgents) | Yes |
| 프로젝트 지식 | `docs/domain/` (온톨로지) | On-demand |
| 폴더별 CLAUDE.md | `hyperagents/CLAUDE.md` | 이 폴더 진입 시 |
| Auto Memory | `~/.claude/memory/MEMORY.md` | Yes (200줄 한도) |

**개선 여지**: 자주 쓰이는 도메인 조각을 `best_practices.md`에 "컨텍스트 스니펫"으로 보존.

## 4. Planning

| 제공 | 구현 |
|---|---|
| 작업 분해 | TaskCreate / TaskUpdate / TaskList |
| 장기 계획 | `docs/prd/` + `docs/plan/` |
| 의존성 관리 | TaskUpdate의 addBlockedBy / addBlocks |
| 에이전트 위임 | Agent(subagent_type=...) |

**개선 여지**: 반복 작업 타입 (예: 신규 화면 추가)의 **작업 템플릿**을 `best_practices.md`에 정의.

## 5. Verification

| 제공 | 구현 | 실행 |
|---|---|---|
| 타입 체크 | `npx tsc --noEmit` | 수동/자동 |
| 빌드 검증 | `npx vite build` | 수동/자동 |
| 자동 스크립트 | `hyperagents/scripts/check.sh` | `bash hyperagents/scripts/check.sh` |
| ESLint | `npm run lint` | 수동 |
| E2E | 없음 | — |
| 인간 검토 | 사용자 피드백 | 매 변경 |

**개선 여지**:
- `scripts/check.sh`에 lint 통합
- 도메인별 검증 (예: ZoneSelector 변경 시 포털 플로우 smoke test)

## 6. Modularity

| 제공 | 구현 |
|---|---|
| 에이전트 페르소나 | Lead / Sage / PRD / Design / Dev / QA / Domain / Chronicle (CLAUDE.md 정의) |
| 코드 모듈 | `src/components/` / `src/pages/` / `src/server/` |
| 하네스 모듈 | `hyperagents/{scripts,logs,harness,...}` 독립 |
| 토글 가능 | Feature flags in `.env` (EXTERNAL_API_LIVE 등) |

**개선 여지**: 페르소나 전환의 **명시적 신호** (Meta Agent 모드 진입/종료) 관례화.

---

## 진화 체크리스트

하네스를 진화시킬 때 자문:
- [ ] 이 개선이 **다음 세션의 에이전트**에게도 쓸모 있는가?
- [ ] **왜**를 함께 기록했는가?
- [ ] 기존 구성요소와 **중복**은 아닌가?
- [ ] 작은 개선인가? (큰 리팩토링은 별도 세션)
- [ ] `evolution.md`에 기록했는가?
