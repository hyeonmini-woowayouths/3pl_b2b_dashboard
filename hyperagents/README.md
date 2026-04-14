# HyperAgents — 자기참조적 하네스 (Self-Referential Harness)

## 배경

Meta/UBC의 **HyperAgents 패턴** (2026) 적용. 에이전트가 단순히 작업을 수행하는 것을 넘어, 작업을 **더 잘 수행하기 위한 인프라(하네스)를 스스로 진화시키는** 자기참조적 시스템.

원문 요약: `docs/sources/external/hyperagents.md`

## 이 폴더의 역할

이 폴더는 에이전트가 **직접 관리하고 진화시키는 하네스**입니다. 프로젝트 소스코드(`src/`)가 "결과물"이라면, `hyperagents/`는 "결과물을 더 잘 만들기 위한 에이전트의 작업환경"입니다.

## 기존 시스템과의 관계

| 층 | 경로 | 역할 | 누가 관리 |
|---|---|---|---|
| Agentic Team | `docs/` | 페르소나 협업 산출물 (PRD/Design/QA 등) | 각 에이전트 페르소나 |
| HyperAgents | `hyperagents/` | 하네스 인프라 (도구/표준/로그) | 에이전트 자신 (자기수정) |
| Auto Memory | `~/.claude/memory/` | 사용자 프로필·피드백 | 에이전트 (user facts) |

세 층은 역할이 명확히 분리됩니다:
- **무엇을** 만들지: `docs/`
- **어떻게** 더 잘 만들지: `hyperagents/`
- **누구를** 위해 만들지: `~/.claude/memory/`

## 하네스 6대 구성요소 (Harness Engineering)

| 요소 | 전통적 구현 | 이 프로젝트 현재 상태 |
|---|---|---|
| Tool Integration | ToolRegistry 클래스 | Claude Code 내장 + `hyperagents/scripts/` |
| Memory & State | MemoryManager | `~/.claude/memory/` + `docs/chronicle/logs/` + `hyperagents/logs/` |
| Context Engineering | 동적 프롬프트 조립 | `CLAUDE.md` + `docs/domain/` + `hyperagents/best_practices.md` |
| Planning | 작업 분해 | TaskCreate/Update + `docs/prd/` |
| Verification | 규칙 기반 체크 | `hyperagents/scripts/check.sh` + 인간 검토 |
| Modularity | 토글 가능 컴포넌트 | agentic team 페르소나 분리 |

상세: `hyperagents/harness.md`

## 진화 루프 (Self-Improvement Loop)

```
    ┌──────────────────────────────────────────┐
    │  1. 작업 수행 (Task Agent)                  │
    │     — src/ 수정, docs/ 업데이트 등          │
    └──────────────┬───────────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────────┐
    │  2. 관찰 & 기록 (Meta Agent)                │
    │     — 반복된 실수/성공 패턴 식별              │
    │     — logs/에 세션 결과 기록                │
    └──────────────┬───────────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────────┐
    │  3. 하네스 개선 (Meta Agent)                │
    │     — best_practices.md 업데이트           │
    │     — coding_standards.md 표본 추가        │
    │     — scripts/에 자동화 스크립트 추가       │
    │     — CLAUDE.md 규칙 갱신 제안             │
    └──────────────┬───────────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────────┐
    │  4. 다음 세션에 반영                          │
    │     — 새 에이전트가 업데이트된 하네스 사용     │
    └──────────────────────────────────────────┘
```

## 디렉토리 구조

```
hyperagents/
├── README.md              ← 이 파일 (전체 개요)
├── CLAUDE.md              ← 에이전트용 메타 지침 (이 폴더 진입 시 필독)
├── harness.md             ← 하네스 6요소 상세 매핑
├── evolution.md           ← 하네스 진화 로그 (Meta Agent 작업 영역)
├── coding_standards.md    ← 좋은 코드 표본 아카이브
├── best_practices.md      ← 이 프로젝트 작업 패턴 라이브러리
├── logs/                  ← 세션별 작업 로그
│   ├── INDEX.md
│   └── YYYY-MM-DD-topic.md
└── scripts/               ← 에이전트가 만든 자동화 도구
    ├── README.md          ← 스크립트 인덱스
    ├── check.sh           ← TS + build 검증
    └── new-log.sh         ← 새 세션 로그 템플릿 생성
```

## 시작하기 (에이전트용)

**작업 시작 전**:
1. `hyperagents/CLAUDE.md` 읽기
2. 현재 태스크와 관련된 `hyperagents/best_practices.md` 섹션 확인
3. 최근 `hyperagents/logs/` 2-3개 훑어보기

**작업 중**:
- 반복되는 검증/변환이 보이면 `hyperagents/scripts/`에 스크립트로 추출
- 사용자 피드백에서 재발 방지 규칙이 도출되면 `best_practices.md`에 기록

**작업 종료 시**:
- `scripts/new-log.sh "<topic>"` 로 로그 생성 후 핵심 기록
- 좋은 코드 패턴이 확인되면 `coding_standards.md`에 아카이브
- 하네스 자체를 개선했다면 `evolution.md`에 한 줄 기록
