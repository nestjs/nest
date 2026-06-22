#!/bin/bash
# Block reads of large generated/vendored paths to save context tokens.
set -euo pipefail

input=$(cat)
path=$(echo "$input" | jq -r '.path // .file_path // .filePath // empty')

if [[ -z "$path" ]]; then
  echo '{ "permission": "allow" }'
  exit 0
fi

# Normalize to forward slashes for matching
path="${path//\\//}"

is_blocked=false
reason=""

case "$path" in
  *node_modules/*|*/node_modules/*)
    is_blocked=true
    reason="node_modules is vendored; read the TypeScript source under packages/ instead."
    ;;
  *.local-node/*|*/.local-node/*)
    is_blocked=true
    reason=".local-node is a local Node.js install; not part of the repo source."
    ;;
  *package-lock.json)
    is_blocked=true
    reason="package-lock.json is large; use package.json for dependency info."
    ;;
  */dist/*|*/dist)
    is_blocked=true
    reason="dist/ is build output; read the TypeScript source instead."
    ;;
  *.d.ts)
    is_blocked=true
    reason="*.d.ts is generated; read the corresponding .ts source under packages/."
    ;;
  */coverage/*|*/.nyc_output/*)
    is_blocked=true
    reason="coverage/ is test output; not source code."
    ;;
  packages/*/*.js)
    is_blocked=true
    reason="packages/**/*.js is compiled output; read the .ts source instead."
    ;;
esac

if [[ "$is_blocked" == true ]]; then
  jq -n \
    --arg msg "$reason" \
    '{ "permission": "deny", "user_message": $msg }'
  exit 0
fi

echo '{ "permission": "allow" }'
exit 0
