#!/bin/bash
# 세션 시작 시 작업 지문 양식과, 진행 중인 작업의 인계 메모를 Claude 컨텍스트에 넣는다.
# 양식이나 진행 중인 작업이 없으면 그 부분은 아무것도 출력하지 않는다.
set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
TASK_DIR="$PROJECT_DIR/docs/tasks"
PROMPT_FILE="$TASK_DIR/START_PROMPT.md"

if [ -f "$PROMPT_FILE" ]; then
  cat "$PROMPT_FILE"
fi

# 상태가 "진행"인 작업 md를 찾아 인계 메모를 보여 준다.
if [ -d "$TASK_DIR" ]; then
  for f in "$TASK_DIR"/*.md; do
    [ -f "$f" ] || continue
    case "$(basename "$f")" in
      TEMPLATE.md|START_PROMPT.md) continue ;;
    esac
    if grep -q "^- 상태: 진행" "$f"; then
      echo ""
      echo "=== 이어서 할 작업: $f ==="
      echo "이 작업은 이전 세션에서 진행 중이었습니다. 처음부터 다시 하지 말고, 아래 인계 메모의 '다음에 할 것'부터 이어서 진행하세요. 세션 번호는 이어받는 세션으로 새로 매깁니다."
      sed -n '/^## 인계/,$p' "$f"
    fi
  done
fi
