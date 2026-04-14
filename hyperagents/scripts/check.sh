#!/usr/bin/env bash
# usage: bash hyperagents/scripts/check.sh
#
# 수정 후 기본 검증 파이프라인.
# 1) TypeScript 타입 체크 (tsc --noEmit)
# 2) Vite production 빌드
#
# 종료 코드:
#   0  — 모두 통과
#   1  — TS 타입 오류
#   2  — Build 오류
#
# 팁: npm run lint 는 현재 통합 안 됨. 필요 시 아래 LINT=1 설정으로 활성화.
#   LINT=1 bash hyperagents/scripts/check.sh

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

step() { printf "\n\033[1;36m==> %s\033[0m\n" "$1"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$1"; }
err()  { printf "\033[1;31m✗ %s\033[0m\n" "$1"; }

# 1) TS check
step "TypeScript 타입 체크 (tsc --noEmit)"
if npx --no-install tsc --noEmit; then
  ok "TS 통과"
else
  err "TS 오류 발견"
  exit 1
fi

# 2) Build
step "Vite 프로덕션 빌드"
if npx --no-install vite build >/tmp/hyperagents-build.log 2>&1; then
  tail -3 /tmp/hyperagents-build.log
  ok "Build 통과"
else
  tail -30 /tmp/hyperagents-build.log
  err "Build 실패 (전체 로그: /tmp/hyperagents-build.log)"
  exit 2
fi

# 3) Optional lint
if [ "${LINT:-0}" = "1" ]; then
  step "ESLint"
  if npm run --silent lint; then
    ok "Lint 통과"
  else
    err "Lint 경고/오류 — 치명적이지 않음"
  fi
fi

printf "\n\033[1;32mAll checks passed.\033[0m\n"
