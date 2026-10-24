#!/bin/bash
# Installs graphify (PyPI package "graphifyy") and registers its Claude Code skill.
# Cloud sessions only; safe to run repeatedly.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

export PATH="$HOME/.local/bin:$PATH"

if ! command -v uv >/dev/null 2>&1; then
  pip install --quiet uv
fi

if ! command -v graphify >/dev/null 2>&1; then
  uv tool install graphifyy
fi

graphify install --platform claude

# Make graphify available on PATH for the rest of the session
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$CLAUDE_ENV_FILE"
fi
