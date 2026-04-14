# 2026-04-14 — HyperAgents 부트스트랩

## 컨텍스트
사용자가 Meta/UBC의 HyperAgents 패턴 (docs/sources/external/hyperagents.md) 도입 지시. 에이전트 자체가 하네스를 진화시키는 자기참조적 시스템 구축이 목표.

## 관찰
- 기존 agentic team (docs/) 은 **협업 출력물**에는 강하지만 에이전트 자신의 **작업 효율·반복 실수**는 잘 축적되지 않음.
- ZoneSelector 리팩토링에서 같은 유형 버그 (한글 IME / useEffect 무한 루프 / sticky 어글리 / modal 크기) 가 반복 노출됨.
- 사용자 메모리(`~/.claude/memory/`) 와 chronicle 레슨런이 있지만, **에이전트가 직접 참조/수정하는 영속 "코딩 지침" 공간**이 부재.

## 판단
- `hyperagents/` 을 3번째 층으로 추가. docs/=무엇을, hyperagents/=어떻게, memory=누구에게 로 역할 분리.
- 초기 best_practices 에 5-6개 반복 패턴 투입 (Gen 0 seed). 이후 세션에서 append.
- 스크립트는 최소한으로 시작 (check.sh, new-log.sh). 사용하면서 늘림.
- CLAUDE.md 에는 HyperAgents 원칙만 간결하게, 상세는 hyperagents/README.md 로 위임.

## 남은 숙제 / 다음 에이전트
- 실제 작업에서 이 폴더가 **얼마나 참조되는지** 관찰. 미참조면 CLAUDE.md hint 강화 필요.
- `scripts/check.sh` 가 충분한지: lint/테스트 추가 고민 필요 (현재 lint 스크립트는 있지만 통합 안 됨).
- `coding_standards.md` 아카이브 확대: 사용자 긍정 피드백 받은 코드만 (엄격한 기준).
- `docs/chronicle/lessons/` 와 `hyperagents/best_practices.md` 간 중복 방지 규칙 확립.
- 3pl 과 3pl_b2b_dashboard 두 repo 간 `hyperagents/` sync 전략 결정.
