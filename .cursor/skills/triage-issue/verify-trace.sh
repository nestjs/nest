#!/bin/bash
# Pre-push gate, wired in via .husky/pre-push (this repo already uses husky for
# pre-commit/commit-msg - this reuses that infra rather than adding a parallel one).
#
# Only fires on branches named <type>/<issue>-<slug> (e.g. fix/15270-resolve-x),
# the convention introduced by the triage-issue skill / lifecycle-trace.mdc.
# Any other branch name is left alone - this is not a generic gate.
#
# What it checks for a matching branch:
#   1. A filled-in ticket at .cursor/triage/<issue>.md (produced by the
#      triage-issue skill) - not just present, but with the placeholder
#      Failing-Test-Evidence text actually replaced.
#   2. No *new* missing-spec gaps (via check-conformance) among the files this
#      branch actually touched relative to its merge base - pre-existing gaps
#      elsewhere in the repo are not this branch's problem and won't block it.
#
# Fails OPEN (does not block) on infra problems it can't resolve (no base ref
# to diff against, etc.) - it only fails CLOSED on a confirmed policy gap, never
# on its own tooling errors. This only blocks `git push` from a machine that has
# this husky hook installed; it is not a substitute for real CI / branch
# protection on the actual GitHub remote.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 0

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || exit 0

if [[ ! "$branch" =~ ^[a-z]+/([0-9]+)-.+$ ]]; then
  echo "pre-push: '$branch' isn't <type>/<issue>-<slug> - triage gate not applicable, skipping."
  exit 0
fi
issue="${BASH_REMATCH[1]}"
ticket=".cursor/triage/${issue}.md"

if [[ ! -f "$ticket" ]]; then
  echo ""
  echo "BLOCKED (pre-push): no triage ticket at $ticket for issue #$issue."
  echo "Run the triage-issue skill and save its filled-out ticket there before pushing."
  exit 1
fi

if grep -q '<paste of `npm run test`' "$ticket" 2>/dev/null; then
  echo ""
  echo "BLOCKED (pre-push): $ticket still has the placeholder Failing-Test Evidence."
  echo "Paste the real (red) test output before pushing - don't fabricate a pass."
  exit 1
fi

echo "pre-push: ticket for #$issue found with evidence filled in. Checking for new spec gaps..."

base=""
if git rev-parse --verify -q origin/master >/dev/null; then
  base="origin/master"
elif git rev-parse --verify -q master >/dev/null; then
  base="master"
else
  echo "pre-push: no master/origin-master ref to diff against - skipping spec-gap check (fail-open)."
  exit 0
fi

merge_base=$(git merge-base "$base" HEAD 2>/dev/null) || { echo "pre-push: couldn't compute merge-base - skipping spec-gap check (fail-open)."; exit 0; }

changed_files=$(git diff --name-only "$merge_base" HEAD -- \
  packages/common/pipes packages/common/exceptions packages/common/serializer \
  packages/common/decorators packages/core/guards packages/core/interceptors \
  packages/core/exceptions packages/microservices/exceptions 2>/dev/null)

if [[ -z "$changed_files" ]]; then
  echo "pre-push: no files in triage-gate scope changed by this branch. OK."
  exit 0
fi

if [[ ! -f .cursor/skills/check-conformance/check.sh ]]; then
  echo "pre-push: check-conformance script missing - skipping spec-gap check (fail-open)."
  exit 0
fi

missing_now=$(bash .cursor/skills/check-conformance/check.sh 2>/dev/null | awk '/^MISSING SPEC:/ {print $3}')

new_missing=""
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  if printf '%s\n' "$missing_now" | grep -qxF "$f"; then
    new_missing="${new_missing}${f}"$'\n'
  fi
done <<< "$changed_files"

if [[ -n "$new_missing" ]]; then
  echo ""
  echo "BLOCKED (pre-push): this branch touches files with no detected test coverage:"
  echo "$new_missing"
  echo "Add the mirrored spec(s) (see tests.mdc) or run check-conformance -v to confirm indirect coverage."
  exit 1
fi

echo "pre-push: no new spec gaps introduced by this branch. OK."
exit 0
