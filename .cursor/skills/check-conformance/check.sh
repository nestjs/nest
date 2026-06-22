#!/bin/bash
# Conventions-as-code check for the 5 HTTP-lifecycle concept areas
# (pipes, exception-filters, guards, interceptors, decorators).
#
# Flags source .ts files with no test coverage detected, per the convention in
# tests.mdc / pipes.mdc / exception-filters.mdc / guards.mdc / interceptors.mdc /
# decorators.mdc: specs normally live in a parallel packages/<pkg>/test/ tree
# that mirrors the source path (never colocated). Some files are legitimately
# covered only indirectly (e.g. ~22 built-in HTTP exception subclasses are all
# exercised together in http.exception.spec.ts, not one spec each) - this script
# checks for that via a symbol-name fallback before flagging anything.
#
# This is a NUDGE, not a gate: it never fails / exits non-zero. Run it before
# opening a PR (see lifecycle-trace.mdc / commit-and-pr skill). Pass -v to also
# print files that are only indirectly covered (no dedicated spec file).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

verbose=false
[[ "${1:-}" == "-v" ]] && verbose=true

is_exempt() {
  local f="$1"
  [[ "$(basename "$f")" == "index.ts" ]] && return 0
  [[ "$(basename "$f")" == "constants.ts" || "$f" == *.constants.ts ]] && return 0
  [[ "$f" == *.interface.ts || "$f" == *.interfaces.ts ]] && return 0
  return 1
}

# Best-effort: first exported class/function/const name in the file.
export_name() {
  grep -oE 'export (default )?(abstract )?(class|function|const) [A-Za-z0-9_]+' "$1" \
    | head -1 | awk '{print $NF}'
}

missing=0
indirect=0
total=0

# $1 source dir, $2 mirrored test dir (subpath must match), $3 package test root
# (searched as a fallback for indirect/aggregate coverage).
check_mirrored() {
  local src_dir="$1" test_dir="$2" pkg_test_root="$3"
  while IFS= read -r -d '' f; do
    [[ "$f" == *.d.ts || "$f" == *.spec.ts ]] && continue
    is_exempt "$f" && continue
    total=$((total + 1))
    rel="${f#"$src_dir"/}"
    expected="${test_dir}/${rel%.ts}.spec.ts"
    if [[ -f "$expected" ]]; then
      continue
    fi
    name=$(export_name "$f")
    if [[ -n "$name" ]] && grep -rl "$name" "$pkg_test_root" >/dev/null 2>&1; then
      indirect=$((indirect + 1))
      $verbose && echo "INDIRECT (no dedicated spec, but '$name' referenced under $pkg_test_root): $f"
      continue
    fi
    echo "MISSING SPEC: $f  (expected: $expected)"
    missing=$((missing + 1))
  done < <(find "$src_dir" -name '*.ts' -print0 2>/dev/null)
}

# Flat test dir, matched by basename only (decorators' test/ isn't subpath-mirrored).
check_flat() {
  local src_dir="$1" test_dir="$2" pkg_test_root="$3"
  while IFS= read -r -d '' f; do
    [[ "$f" == *.d.ts || "$f" == *.spec.ts ]] && continue
    is_exempt "$f" && continue
    total=$((total + 1))
    base=$(basename "$f" .ts)
    if find "$test_dir" -name "${base}.spec.ts" 2>/dev/null | grep -q .; then
      continue
    fi
    name=$(export_name "$f")
    if [[ -n "$name" ]] && grep -rl "$name" "$pkg_test_root" >/dev/null 2>&1; then
      indirect=$((indirect + 1))
      $verbose && echo "INDIRECT (no dedicated spec, but '$name' referenced under $pkg_test_root): $f"
      continue
    fi
    echo "MISSING SPEC: $f  (expected basename: ${base}.spec.ts under $test_dir)"
    missing=$((missing + 1))
  done < <(find "$src_dir" -name '*.ts' -print0 2>/dev/null)
}

check_mirrored packages/common/pipes              packages/common/test/pipes              packages/common/test
check_mirrored packages/common/exceptions         packages/common/test/exceptions         packages/common/test
check_mirrored packages/core/exceptions           packages/core/test/exceptions           packages/core/test
check_mirrored packages/microservices/exceptions  packages/microservices/test/exceptions  packages/microservices/test
check_mirrored packages/core/guards               packages/core/test/guards               packages/core/test
check_mirrored packages/core/interceptors         packages/core/test/interceptors         packages/core/test
check_mirrored packages/common/serializer         packages/common/test/serializer         packages/common/test
check_flat     packages/common/decorators         packages/common/test/decorators         packages/common/test

echo "---"
echo "$missing missing / $indirect indirect-only / $total total source files checked."
$verbose || echo "(run with -v to also list indirect-only files)"
exit 0
