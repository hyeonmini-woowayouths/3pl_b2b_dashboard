# Evolution Log — 하네스 진화 로그

> `hyperagents/` 폴더의 **구조적 변경** 기록. Meta Agent 작업 영역.
> 포맷: `## YYYY-MM-DD — 제목` + 변경 내역 + 왜 (append only).

---

## 2026-04-14 — HyperAgents 패턴 부트스트랩 (Generation 0)

**변경**:
- `hyperagents/` 폴더 생성
- README / CLAUDE.md / harness.md / best_practices.md / coding_standards.md / evolution.md / logs/INDEX.md / scripts/{check.sh, new-log.sh, README.md} 초기 파일 추가
- 루트 `CLAUDE.md` 에 "HyperAgents Workflow" 섹션 추가

**왜**:
- 기존 agentic team (docs/) 이 **협업 산출물**에는 최적화되어 있으나, 에이전트 **자체의 작업 방식** (반복 패턴·검증·컨텍스트) 진화 메커니즘이 약했음.
- 사용자 피드백 ("같은 실수 반복", "팀으로 일해라")이 누적 → 자기참조적 하네스 필요성 증가.
- HyperAgents 논문의 6대 구성요소 중 Memory/Verification/Modularity를 체계화할 공간 확보.

**초기 patterns 추출 소스**:
- `src/components/portal/ZoneSelector.tsx` 리팩토링 history (한글 IME / sticky / modal height 등)
- `src/server/integrations/nts.ts` (외부 API 이중 인코딩)
- `src/lib/kakao-map.ts` (SDK 로더 패턴)
- `docs/chronicle/lessons/` (기존 레슨런)

**다음 세대 가이드**:
- 세션마다 `logs/` 에 기록 — 반복 관찰되는 항목은 `best_practices.md` 로 승격
- `scripts/check.sh` 를 매 변경 후 실행해 TS/build 오류 조기 발견
- 사용자 피드백으로 재발 방지 규칙 도출 시 `best_practices.md` OR `coding_standards.md` 갱신

---

## 2026-04-14 — Agent Team 완전 폐지 + HyperAgents 단독 체제 (Generation 1)

**변경**:
- 기존 12 페르소나 (Lead/Sage/Doc/PRD/Consultant/Design/Dev/Data/Security/QA/Domain/Chronicle) **전체 폐지**
- `CLAUDE.md` 대대적 재작성: 1,084줄 → 257줄 (기존 Agent Definitions 전체 제거, HyperAgents 중심 재구성)
- `hyperagents/review_protocols.md` 신설 (Sage 역할 흡수 — Pre-flight / Checkpoint / Retrospective 3단계)
- `hyperagents/artifacts.md` 신설 (기존 10개 페르소나의 산출물 포맷을 "문서 유형별 가이드"로 재편)
- `hyperagents/CLAUDE.md` 갱신 (Review Protocols 참조 + Artifacts 참조 추가)
- `docs/chronicle/` → 읽기 전용 아카이브로 전환 (신규 작성 X, `hyperagents/logs/` 사용)
- 3pl / 3pl_b2b_dashboard 양쪽 CLAUDE.md sync 완료

**왜**:
- 사용자 결정: "기존 에이전트 팀 자체를 hyperagents로 대체"
- 기존 시스템 중복: Sage ↔ Self-Correction Loop, Chronicle ↔ hyperagents/logs
- 12 페르소나가 Context window 대량 소비 (1,084줄 → 257줄로 76% 축소)
- 사실상 사용되지 않던 페르소나 다수 (Doc, Data, Consultant, QA 등)

**보존된 것**:
- docs/ 하위 디렉토리 구조 (산출물 포맷 포함) — "페르소나 라벨 없이 문서 유형 기준"
- 도메인 온톨로지 (docs/domain/) — 지적 자산으로 별도 언급
- docs/chronicle/ — 과거 기록 아카이브

**Sage 기능 흡수 매핑**:
| 기존 Sage 기능 | 새 위치 |
|---|---|
| 가정 검증 (Assumptions) | review_protocols.md → Pre-flight |
| Unknown Unknowns | review_protocols.md → Pre-flight |
| 누락된 관점 (Perspectives) | review_protocols.md → Pre-flight |
| 방향 제안 (Reframing) | review_protocols.md → Pre-flight |
| 인지 편향 점검 (Bias Check) | review_protocols.md → Pre-flight |
| 중간 점검 (Checkpoint) | review_protocols.md → Checkpoint |
| 레슨런 추출 | review_protocols.md → Retrospective |

**다음 세대 가이드**:
- **관찰 필요**: 실제 세션에서 review_protocols.md 가 얼마나 참조되는지
- **조정 기준**: Pre-flight 가 너무 무겁다면 체크리스트 축소, 너무 형식적이면 trigger 조건 강화
- **진화 방향**: 검증 스크립트 확대 (lint 통합, smoke test), 도메인 자동 검증
