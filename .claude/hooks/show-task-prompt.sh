#!/bin/bash
# 세션 시작 시 작업 지문 양식을 Claude 컨텍스트에 넣는다. 양식이 없으면 아무것도 하지 않는다.
set -euo pipefail

PROMPT_FILE="${CLAUDE_PROJECT_DIR:-$(pwd)}/docs/tasks/START_PROMPT.md"

if [ -f "$PROMPT_FILE" ]; then
  cat "$PROMPT_FILE"
fi
