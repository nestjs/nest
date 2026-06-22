---
name: triage-issue
description: >-
  Paste a GitHub issue (or give an issue number) to get a structured ticket -
  category, problem, solution, blast-radius/difficulty, workarounds, release
  estimate, acceptance criteria - plus a branch off the issue number and
  failing tests proving the gap before any fix is written. Use when triaging,
  scoping, or planning a bug report, feature request, or regression.
---

# Triage Issue → Failing Tests

Orchestrates existing conventions rather than inventing new ones:
- Category taxonomy → `.github/ISSUE_TEMPLATE/` (Bug, Feature, Regression, Performance)
- Blast radius / difficulty → `ARCHITECTURE.md` §3-4 (pull verbatim, don't re-score)
- Trace ID = issue number, commit/PR conventions → `lifecycle-trace.mdc`, `commit-and-pr` skill
- Spec location (mirror source, never colocated) → `tests.mdc` + concept rules
- Coverage gaps → `check-conformance` skill
- Build/lint/integration gates → `build-and-verify`, `run-integration-tests` skills
- Push-time enforcement → `.husky/pre-push` runs `verify-trace.sh` (see Guardrails)

## Input

Paste the issue text directly, or give an issue number/URL — if you reference a
number/URL, try `gh issue view <n>` first; if `gh` isn't installed or authenticated,
ask for the text instead. Don't guess at issue content.

## Steps

1. **Classify** against the 4 real categories in `.github/ISSUE_TEMPLATE/`. If it
   doesn't clearly fit one, ask rather than force it.
2. **Locate the surface.** Grep the named symbol/behavior; find the matching row
   in `ARCHITECTURE.md` §4's cheat sheet (or the closest analog).
3. **Rate.** Copy Blast Radius and Difficulty straight from that table — don't
   invent a new scale.
4. **Write 3-7 acceptance criteria**, Given/When/Then, each naming the test that
   will assert it.
5. **Branch:** `git checkout -b <type>/<issue>-<slug> master` (`master` is this
   repo's base branch per `CONTRIBUTING.md`; `<type>` matches `commit-and-pr`'s
   conventional-commit types).
6. **Scaffold the failing test(s)** at the mirrored `test/` path for the
   identified surface, matching the sibling specs' mocha + chai style
   (`describe`/`it`, `expect(...).to.equal(...)`). Routing/adapter/transport
   issues need an `integration/` spec instead (Docker) — flag this, don't fake
   a unit test for it.
7. **Prove it's red.** Run `npm run test` (or the integration script) and paste
   the failing output into the ticket. If it unexpectedly passes, stop and say
   so — don't write a fix to force red, and don't claim a gap that isn't real.
8. **Save the ticket.** Copy `ticket-template.md` to `.cursor/triage/<issue-number>.md`
   and fill it in completely there (not just as chat output) — the pre-push gate
   in Guardrails reads this exact path, so an unsaved ticket can't be verified.
9. **Ownership gate:** non-tech-ownable only if Difficulty = Trivial AND
   Blast Radius = none/low AND only `sample/*` or `*.md` is touched (this is
   `ARCHITECTURE.md`'s own Trivial bar, not a new threshold). Anything else →
   engineer required; a non-engineer can still own the ticket and run the gates.

## Guardrails

- This skill stops at red — it does not write the fix.
- Never leave the PR template's `Issue Number:` field at `N/A` if a real issue
  exists (see `lifecycle-trace.mdc`); if none exists yet, say so and point at
  the `[discussion]`-issue process for major changes.
- Don't touch `packages/common/interfaces|decorators` or `core/injector|router`
  as part of triage scaffolding — flag Hard/breaking and stop there.
- **Enforcement is real but local, not CI.** `verify-trace.sh` in this folder is meant to
  run as `.husky/pre-push` so a missing/placeholder ticket blocks `git push` on a machine
  that has it installed — see `pre-push.sh` in this folder for the one line to copy into
  `.husky/pre-push` (file-tool writes to `.husky/` are blocked in this environment as a
  safety measure, so that copy is a manual, one-time step on your own machine). This is
  *not* equivalent to GitHub branch protection or required-status-checks on `nestjs/nest` —
  it's bypassable with `--no-verify` or from any machine without the hook installed. Treat
  it as a strong local nudge for this team's own workflow, not a substitute for real CI.
