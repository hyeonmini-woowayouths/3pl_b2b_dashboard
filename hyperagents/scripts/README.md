# Scripts Index

> 에이전트가 만든 자동화 스크립트. 반복되는 수작업을 이곳에 승격.
> 모든 스크립트는 독립 실행 가능해야 하고, 상단에 `# usage:` 주석 필수.

## 승격 기준 (CLAUDE.md 로컬 지침 참조)
- 같은 명령/체크를 **3회 이상** 반복 실행
- 입력→출력 판정이 명확
- 비결정적 요소 없음

## 현재 스크립트

| 파일 | 목적 | 사용 |
|---|---|---|
| `check.sh` | TS 타입 체크 + Vite 빌드 검증 | `bash hyperagents/scripts/check.sh` |
| `new-log.sh` | 새 세션 로그 템플릿 생성 | `bash hyperagents/scripts/new-log.sh "<topic>"` |

## 추가 후보 (관찰 중)

- `sync-claudemd.sh` — 3pl / 3pl_b2b_dashboard 양쪽 CLAUDE.md sync
- `audit-todos.sh` — TODO 주석 취합
- `api-smoke.sh` — `/api/zones`, `/api/portal/*` 헬스체크

관찰이 누적되면 위 목록에서 승격.
