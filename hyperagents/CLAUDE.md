# hyperagents/ — 에이전트용 메타 지침

> 이 파일은 `hyperagents/` 폴더를 **참조하거나 수정하는 에이전트**를 위한 로컬 CLAUDE.md입니다.
> 루트 `CLAUDE.md`의 HyperAgents 섹션과 함께 읽으세요.

## 핵심 원칙

### 1. 하네스 진화는 점진적
- 한 세션에서 모든 걸 고치려 하지 마세요. **1-2개 작은 개선**이 더 견고합니다.
- 이유: HyperAgents 논문의 핵심 — 반복 세대(generation)를 거치며 수렴. 한 번에 크게 바꾸면 회귀 위험.

### 2. 기록이 선순환의 연료
- **왜**를 함께 기록하세요. "이렇게 했다"가 아니라 "이 상황이라서 이렇게 했다".
- 다음 세션의 에이전트가 **맥락**을 복원할 수 있어야 재활용이 일어납니다.

### 3. 사용자 피드백 = 선물
- 사용자가 "X 하지 마" 또는 "Y는 왜 이래"라고 했을 때:
  1. 단순 수정으로 끝내지 말고
  2. `hyperagents/best_practices.md` 또는 `coding_standards.md`에 **재발 방지 규칙**으로 승격
  3. 가능하면 `scripts/`에 자동 검증으로 변환

### 4. 스크립트 승격 기준
반복되는 **수작업 검증/변환**을 발견하면 스크립트로:
- 같은 명령을 3번 이상 실행한 적이 있음
- 검증 단계가 명확함 (입력 → 출력 판정)
- 비결정적 요소 없음

예: "TS 체크 → build → lint" 삼단계 검증을 매 변경마다 돌리고 있다면 `scripts/check.sh`로.

### 5. 모듈성
- `scripts/`는 **독립 실행 가능**하게. 다른 스크립트에 의존하지 않도록.
- 각 스크립트 상단에 `# usage: ...` 주석 필수.

## 작업 흐름 (매 세션)

### 시작 시
```bash
# 최근 로그 훑기
ls -lt hyperagents/logs/ | head -5

# 이 프로젝트 표준 확인 (한 번 로드해두면 세션 내내 유효)
cat hyperagents/best_practices.md | head -50
```

### 진행 중
- 새 코드 작성 후: `bash hyperagents/scripts/check.sh` (TS + build 자동 검증)
- 특정 영역 작업: `hyperagents/best_practices.md`의 해당 섹션 확인

### 종료 시
```bash
# 로그 템플릿 생성 (토픽 명시)
bash hyperagents/scripts/new-log.sh "zone-selector-ux"

# 편집 후 저장
# 필요 시 best_practices.md / coding_standards.md / evolution.md 업데이트
```

## 하지 말아야 할 것

- `scripts/` 안에 **비가역적** 동작 (force push, rm -rf 등) 자동화 금지
- `logs/`는 append only. 과거 로그 수정 금지 (필요 시 교정 로그 별도 추가)
- `coding_standards.md` 아카이브는 사용자가 긍정 피드백 준 코드만. 추측으로 추가 금지
- 하네스 개선이 **작업 자체보다 오래 걸리면** 중단하세요. 비례 원칙.

## Review Protocols (메타인지 점검)

기존 Sage Agent 역할은 **세 가지 프로토콜**로 흡수되었습니다. 상세는 `hyperagents/review_protocols.md`.

| 프로토콜 | 언제 | 목적 |
|---|---|---|
| **Pre-flight Review** | 비자명/모호/중요 요청 시작 전 | 가정 점검·Unknown Unknowns·Reframing |
| **Checkpoint Review** | 마일스톤 중간, 드리프트 의심 시 | 설계 재검증·테스트 공백·스코프 확인 |
| **Retrospective Review** | 세션 종료 시 (의무) | 하네스 부재 탐지·패턴 승격·진화 기록 |

**비례 원칙**: 단순 작업엔 간결 모드, 복잡 결정엔 산출물 필수. 무작정 전부 돌리지 않음.

## Meta Agent 모드

에이전트는 기본 Task Agent로 동작하되, 다음 순간 **Meta Agent 모드**로 전환:
- 사용자가 "팀으로 일해라", "하네스를 정리해라"
- 같은 실수가 2회 이상 반복되었을 때
- 세션 종료 시점 (Retrospective Review 의무)

Meta Agent는 src/를 수정하지 않고 `hyperagents/`와 `docs/` 리뷰·로그만 수정합니다.

## Artifacts (산출물 가이드)

**기존 페르소나 → 문서 유형** 으로 재해석. 모든 산출물 포맷·품질 기준은 `hyperagents/artifacts.md` 에 정의.
페르소나 라벨(`@PRD`, `@Dev` 등) 은 더 이상 사용하지 않습니다.

## 진화 로그 기록 의무

이 폴더의 **모든 구조적 변경** (새 스크립트 추가, best_practice 카테고리 신설, harness.md 매핑 변경)은 `evolution.md`에 한 줄 이상 남기세요. 회고 시 진화 궤적을 확인할 수 있어야 합니다.
