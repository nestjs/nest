#!/bin/bash
# Preflight for the implement-issue skill: confirms the red->green handoff
# preconditions before any code is written. Advisory only — it never edits
# anything. The real *enforced* gate is .husky/pre-push (verify-trace.sh from
# the triage-issue skill); this is the agent-layer nudge that runs earlier.
#
# Output lines are prefixed OK / WARN / STOP so the agent can act on them:
#   STOP  -> a precondition is missing; run triage-issue first, don't improvise.
#   WARN  -> proceed, but a gate or evidence needs attention.
#   OK    -> precondition satisfied.
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "STOP  not inside a git repo."; exit 0; }

ok=true
issue=""

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
if [[ "$branch" =~ ^[a-z]+/([0-9]+)-.+$ ]]; then
  issue="${BASH_REMATCH[1]}"
  echo "OK    branch '$branch' -> issue #$issue"
else
  echo "STOP  branch '$branch' isn't <type>/<issue>-<slug>. Run the triage-issue skill first."
  ok=false
fi

if [[ -n "$issue" ]]; then
  ticket=".cursor/triage/${issue}.md"
  if [[ ! -f "$ticket" ]]; then
    echo "STOP  no triage ticket at $ticket. Run the triage-issue skill first."
    ok=false
  elif grep -q '<paste of `npm run test`' "$ticket" 2>/dev/null; then
    echo "WARN  $ticket still has placeholder Failing-Test Evidence."
    echo "      Confirm the spec is actually red before implementing — don't write a fix against a green test."
  else
    echo "OK    triage ticket present with evidence: $ticket"
  fi
fi

if [[ -f .husky/pre-push ]]; then
  echo "OK    .husky/pre-push installed (verify-trace gate will run on push)."
else
  echo "WARN  .husky/pre-push not installed — the enforced triage gate won't run on push."
  echo "      one-time fix:"
  echo "        cp .cursor/skills/triage-issue/pre-push.sh .husky/pre-push && chmod +x .husky/pre-push"
fi

echo "---"
if $ok; then
  echo "preflight OK: clear to implement."
else
  echo "preflight blocked: resolve the STOP line(s) above first."
fi
exit 0
