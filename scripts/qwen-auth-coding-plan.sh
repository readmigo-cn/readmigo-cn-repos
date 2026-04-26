#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${BAILIAN_CODING_PLAN_API_KEY:-}" ]]; then
  echo "BAILIAN_CODING_PLAN_API_KEY is not set."
  echo "Run:"
  echo "  export BAILIAN_CODING_PLAN_API_KEY=your_key"
  echo "  ./scripts/qwen-auth-coding-plan.sh"
  exit 1
fi

qwen auth coding-plan -r china -k "${BAILIAN_CODING_PLAN_API_KEY}"
