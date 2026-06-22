---
name: implement-issue
description: >-
  Take a triaged issue from failing test (red) to a verified, PR-ready change
  (green): implement the minimal fix within scope, run the build/test/lint and
  conformance gates, update the triage ticket with green evidence plus a
  rollout/rollback note, and render the PR body for PM/QA/DevOps. Use after the
  `triage-issue` skill has produced a red ticket, when implementing a scoped
  fix/feature for a GitHub issue, or when asked to take an issue "to a PR".
---

# Implement Issue → Verified PR (red → green)

Middle stage of this repo's three-skill pipeline:

```
triage-issue (plan → red)  →  implement-issue (red → green)  →  commit-and-pr (green → shipped)
```

It does **not** re-triage (that's `triage-issue`) and it does **not** run the git/`gh`
mechanics (that's `commit-and-pr`). It owns only the red→green middle: implement, verify,
and prepare the PR record.

## When to use

- A `triage-issue` ticket exists at `.cursor/triage/<issue>.md` with red (failing) evidence
  and you're ready to write the fix.
- Someone asks to "implement", "take to a PR", or "make the failing test pass" for a scoped
  issue.

If there's no triage ticket or branch yet, **stop and run `triage-issue` first** — don't
improvise triage here.

## Preconditions — run preflight first

```bash
bash .cursor/skills/implement-issue/scripts/preflight.sh
```

It confirms (advisory; it never edits anything):

1. You're on a `<type>/<issue>-<slug>` branch (the convention from `triage-issue` /
   `lifecycle-trace.mdc`).
2. A filled triage ticket exists at `.cursor/triage/<issue>.md` with real red evidence
   (not the placeholder).
3. `.husky/pre-push` is installed — the one *enforced* gate (`verify-trace.sh`). If it's
   missing, preflight prints the one-time install step and continues with a warning.

Resolve any `STOP` line before writing code.

## Steps

1. **Re-read the ticket.** Implement the **minimal** change that turns the failing spec
   green, against the exact surface the ticket identified — nothing more.
   - **Additive contribution? Wire the barrel export.** A new pipe/exception/decorator isn't
     part of `@nestjs/common`'s public API until it's re-exported. Add
     `export * from './<file>'` to the relevant `index.ts` (e.g.
     `packages/common/pipes/index.ts` or `exceptions/index.ts`; a new decorator goes in its
     `decorators/core|http|modules/index.ts` subfolder barrel), keeping the file's existing
     alphabetical order. `check-conformance` exempts `index.ts`, so it will **not** catch a
     missing export — this step is on you. See the relevant concept rule (`pipes.mdc` etc.).
2. **Respect scope + layering.** Touch only the target package directory, its existing
   public exports, and the mirrored test path. Never introduce a `common → core` import
   (ARCHITECTURE.md dependency rule). Do **not** touch `packages/common/interfaces|decorators`
   or `core/injector|router` unless the ticket explicitly scopes you there — those are
   Hard/breaking; flag and stop.
3. **Update the spec.** Extend or adjust the mirrored `*.spec.ts` for the behavior change
   (specs mirror source, never colocated — `tests.mdc`). Don't weaken the failing assertion
   just to make it pass.
4. **Run the gates** — use the existing skills, do not restate their commands:
   - `build-and-verify` skill — build + unit tests + lint (canonical command list).
   - `check-conformance` skill — must show **no new** `MISSING SPEC` for files this branch
     touched.
   - `run-integration-tests` skill (Docker) — **required** if the change touches routing,
     adapters, or transports. If Docker isn't available, stop and say so; never claim
     integration coverage you didn't run.
5. **Prove green.** Capture the now-passing test output. If any gate fails, fix and re-run —
   do not proceed to a PR with a red gate, and do not fabricate a pass.
6. **Update the triage ticket in place.** Flip its Failing-Test Evidence from red to green,
   list the files actually changed, and fill the rollout/rollback block (see
   `references/devops-and-rollback.md`). The ticket stays the single source of truth.
7. **Render the PR body** from the ticket using `assets/pr-body-template.md`. It reuses the
   repo's `PULL_REQUEST_TEMPLATE.md` and fills `Issue Number` from the Trace ID. This is the
   one-source / three-audience rendering: PM (current behavior, plain language), QA (the test
   list + edge cases), DevOps (CI jobs touched, release tier, rollback).
8. **Hand off to `commit-and-pr`** for the conventional commit and `gh pr create`. Do not
   duplicate commit/PR mechanics here.

## Definition of done

- Target spec green; build/test/lint green (via `build-and-verify`); integration green or
  explicitly N/A with a stated reason.
- `check-conformance` shows no new gap for touched files.
- Triage ticket updated: green evidence + files changed + rollout/rollback.
- PR body rendered from the template; `commit-and-pr` invoked for the actual push/PR.
- `.husky/pre-push` installed — or the warning surfaced to the user so it's a conscious skip.

## Guardrails

- **Minimal change only** — no opportunistic refactors outside the ticket's scope.
- **Escalate, don't push through** Hard/breaking surfaces (`common` public API,
  `injector`/`router`). This skill is for scoped, landable changes.
- **Don't fabricate green.** If you can't make it pass, report why and stop.
- **Single-source the shared knowledge:** commit format/scopes/`gh` flow live in
  `commit-and-pr`; build/test/lint live in `build-and-verify`; Docker integration in
  `run-integration-tests`. Reference them — never copy their commands into this file.
