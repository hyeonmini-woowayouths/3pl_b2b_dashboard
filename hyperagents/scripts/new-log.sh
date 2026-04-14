#!/usr/bin/env bash
# usage: bash hyperagents/scripts/new-log.sh "<topic-slug>"
# 예:    bash hyperagents/scripts/new-log.sh "zone-selector-refactor"
#
# 오늘 날짜로 hyperagents/logs/YYYY-MM-DD-<topic>.md 템플릿을 생성하고
# logs/INDEX.md 에도 링크를 자동 추가합니다.

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "usage: $0 \"<topic-slug>\"" >&2
  exit 1
fi

TOPIC="$1"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOGS_DIR="$ROOT/hyperagents/logs"
DATE="$(date +%Y-%m-%d)"
# 공백 → 하이픈, 연속 하이픈 단일화, 소문자
SLUG=$(echo "$TOPIC" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9가-힣]+/-/g; s/-+/-/g; s/^-//; s/-$//')
FILE="$LOGS_DIR/$DATE-$SLUG.md"

if [ -e "$FILE" ]; then
  echo "이미 존재: $FILE" >&2
  exit 1
fi

TITLE_HUMAN="$TOPIC"

cat > "$FILE" <<EOF
# $DATE — $TITLE_HUMAN

## 컨텍스트
<!-- 무엇을 하려고 했는가. 배경·목표·제약 -->

## 관찰
<!-- 무엇이 일어났는가. 특히 의외의 것, 반복 실수, 사용자 피드백 -->

## 판단
<!-- 왜 이렇게 했는가. 선택한 접근과 그 근거 -->

## 남은 숙제 / 다음 에이전트
<!-- 후속 작업, 검증 대기, 전달할 주의사항 -->

## 하네스 개선 후보
<!-- 이 세션에서 best_practices.md / coding_standards.md / scripts/ 에 승격할 만한 것 -->
EOF

# INDEX 에 링크 추가 (최신 위로)
INDEX="$LOGS_DIR/INDEX.md"
LINK="- [$DATE — $TITLE_HUMAN]($DATE-$SLUG.md)"
if ! grep -qF -- "$LINK" "$INDEX"; then
  # "## 목록" 섹션 첫 블럭 내부 <!-- 새 로그는 아래에 추가 --> 다음 줄에 삽입
  awk -v link="$LINK" '
    /<!-- 새 로그는 아래에 추가 -->/ { print; print ""; print link; inserted=1; next }
    { print }
  ' "$INDEX" > "$INDEX.tmp" && mv "$INDEX.tmp" "$INDEX"
fi

echo "생성: $FILE"
echo "INDEX 업데이트: $INDEX"
