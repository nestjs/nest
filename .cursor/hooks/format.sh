#!/bin/bash
# Auto-format edited files with prettier (matches lint-staged config).
set -euo pipefail

input=$(cat)
path=$(echo "$input" | jq -r '.path // .file_path // .filePath // empty')

if [[ -z "$path" || ! -f "$path" ]]; then
  exit 0
fi

case "$path" in
  *.ts|*.json)
    if [[ -x "./node_modules/.bin/prettier" ]]; then
      ./node_modules/.bin/prettier --ignore-path ./.prettierignore --write "$path" 2>/dev/null || true
    fi
    ;;
esac

exit 0
