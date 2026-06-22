# AI-Agent Enablement — Design Note

Design rationale for the agent tooling layered onto the `nestjs/nest` monorepo: what was
built to make this repo safely AI-developable, and why each piece exists. This describes the
system **as shipped** — see each `SKILL.md` / `.mdc` for the operational detail.

## Goals

1. **Onboard a new engineer** without making them read every nuance of the codebase — the
   agent supplies the context on demand.
2. **Get to a correct first contribution** — blast-radius awareness, TDD, and repo
   conventions (naming, spec placement, commit scopes) enforced, not memorized.
3. **Let PM / QA / DevOps follow along** with the changes an engineer (or agent) makes.

North star: **accuracy on every PR, and reuse details as much as possible** (one source of
truth, referenced — never copied). Future direction: move CI knowledge (unit + e2e gates)
earlier in the process so PR cycle time drops.

## Target

The NestJS framework monorepo itself, not a generated sample app. It's an unusually literal
match for the scenario: decorator-driven, convention-heavy, with **real** CI/lint/commit
gates and a real `CONTRIBUTING.md` to ground against instead of inventing process. Audience
for the tooling: a new `nestjs/nest` contributor, plus the PM/QA/DevOps roles around them.

## Primitives chosen, and why

Verified against current Cursor docs, not recalled from memory.

- **Project Rules** (`.cursor/rules/*.mdc`, version-controlled). Frontmatter:
  `description` / `globs` / `alwaysApply`. Best practice from Cursor's docs: reference files
  by `@`-path instead of copying their contents, keep rules small, split by concern.
  → **One always-apply root rule** (`00-index.mdc`) for facts that hold repo-wide (test
  stack is Mocha/Chai/Sinon not Jest; the do-not-read list; search-before-explore) and
  **per-package, glob-scoped rules** for conventions that differ by package
  (`pipes`, `guards`, `interceptors`, `decorators`, `exception-filters`, `tests`,
  `packages`, `samples`, `lifecycle-trace`). They point at `ARCHITECTURE.md` /
  `CONTRIBUTING.md` rather than restating them. Only `00-index` is always-on, so the
  always-loaded context stays tiny.

- **Agent Skills** (`.cursor/skills/<name>/SKILL.md`, the open Agent Skills standard Cursor
  now discovers natively; also read by Claude Code / Codex). Frontmatter `name` /
  `description`, with optional `scripts/`, `references/`, `assets/` loaded progressively.
  → This is where multi-step **workflows** live. The centerpiece is a three-skill pipeline
  (below); supporting skills (`build-and-verify`, `run-integration-tests`,
  `check-conformance`, `http-request-chain`) are single-responsibility leaves the pipeline
  composes, so command knowledge is defined once and referenced everywhere.
  A pipeline of composable skills fits the "reuse details" north star better than one
  monolithic command.

- **Hooks** (`.cursor/hooks/`, `hooks.json`). `guard-read.sh` (a `beforeReadFile` hook)
  blocks reads of vendored/generated paths to protect the context budget; `format.sh`
  (`afterFileEdit`) runs prettier to match `lint-staged`. Defense-in-depth with
  `.cursorignore` and `00-index`'s do-not-read list — three mechanisms, same intent.

- **`@Docs`** — lower priority. Most of what a contributor needs is already in-repo; `@Docs`
  earns its place only for `docs.nestjs.com` (the public API contract these packages
  implement). Worth wiring, not worth over-indexing.

## The contribution pipeline (Goals 1–3)

Rather than one scaffold command, the workflow is a three-skill pipeline mapped to the change
lifecycle, each stage handing a concrete artifact to the next:

```
triage-issue        →   implement-issue       →   commit-and-pr
(plan → red)            (red → green)             (green → shipped)
ticket + failing test   verified change +         conventional commit +
at .cursor/triage/      updated ticket +          gh PR against a fork
                        rendered PR body
```

- **`triage-issue`** — classify against the real `.github/ISSUE_TEMPLATE` categories, locate
  the surface, pull blast-radius/difficulty **verbatim** from `ARCHITECTURE.md` §3-4 (never
  re-scored), write Given/When/Then acceptance criteria, branch as `<type>/<issue>-<slug>`,
  and scaffold the **failing** test that proves the gap. Stops at red — it never writes the
  fix. Its `verify-trace.sh`, wired in as `.husky/pre-push`, is the one *enforced* gate.

- **`implement-issue`** — the red→green middle. Preflight checks the handoff preconditions
  (branch, filled ticket, pre-push installed), then the minimal in-scope fix is implemented,
  the gates are run via the leaf skills, the triage ticket is updated to green with a
  rollout/rollback note, and the PR body is rendered. Escalates and stops on Hard/breaking
  surfaces (`common` public API, `injector`/`router`) rather than pushing through.

- **`commit-and-pr`** — conventional commit (types/scopes kept in sync with
  `.commitlintrc.json`) and the `gh` fork-PR flow. Kept separate so self-found fixes that
  never went through triage still have a home, and so commit/`gh` knowledge is single-sourced.

## Requirement-by-requirement mapping

1. **First contribution, no full codebase read.** The per-concept rules (`pipes.mdc` et al.)
   and the pipeline are modeled on a verified-correct reference contribution:
   `ParsePositiveIntPipe` + mirrored spec + barrel export (same shape as `ParseIntPipe`).
   That reference is the onboarding exercise — implement it fresh to prove the tooling.
   A `scaffold-contribution` skill that generalizes the pattern is the next planned addition
   (see below).
2. **Catch mistakes early, strengthen tests.** TDD is structural: `triage-issue` requires a
   red test before any fix, `implement-issue` won't proceed past a failing gate, and
   `check-conformance` flags any source file missing its mirrored spec (it currently surfaces
   4 real gaps). Deprecated-API awareness is grounded against the live repo
   (`MetadataScanner.scanFromPrototype` → `getAllMethodNames`, Kafka's legacy partitioner →
   `DefaultPartitioner`, the old `MaxFileSizeValidator` shape → `errorMessage`).
3. **Fit the path to production; approved boundaries.** Scope is concrete: target package
   dir + its public exports + the mirrored test path, honoring the `ARCHITECTURE.md`
   dependency layering (`common` never imports `core`). Enforced two ways — statically via
   rule `globs` so out-of-scope files don't enter context, and procedurally by reusing the
   repo's *existing* guardrails (CircleCI matrix, husky pre-commit → lint-staged, commitlint
   scope enum). Deliberately not a parallel CI system — the goal is to *fit* the team's CI.
4. **Maintainable without the author.** Everything is plain version-controlled files
   (`.cursor/rules`, `.cursor/skills`, `.cursor/hooks`, `ARCHITECTURE.md`, `docs/DEVELOPER.md`)
   — no external service, no hidden state. Rules and skills reference source files instead of
   duplicating them, so a convention change keeps working and an API rename breaks the
   reference loudly rather than rotting silently.
5. **Multi-audience (PM/QA/DevOps).** One source, three renderings: the triage ticket already
   carries Problem (PM), Acceptance Criteria (QA), and Blast Radius + Gates + Release tier
   (DevOps); `implement-issue` renders these into the PR body from the repo's actual PR
   template — the PR being where these roles actually follow along. The DevOps block names the
   CI jobs the diff touches, the semver tier, and a library-correct rollback (revert + release,
   not a runtime flag), with a documented slot for flag-gated app repos later.

## What's built vs. what's next

Built: `ARCHITECTURE.md` (package map, blast-radius ratings, flow diagrams),
`docs/DEVELOPER.md`, the rule set (1 always-apply + 9 scoped), the hooks, and the skill set —
the `triage-issue` →
`implement-issue` → `commit-and-pr` pipeline plus the `build-and-verify`,
`run-integration-tests`, `check-conformance`, and `http-request-chain` leaves.

Next: Establish a working pattern for the team. Make sure how it can accomplish org wide as well.
How to go further with the Builder mentality?

## Known limitations

- **No Docker in the build environment**, so the Docker-gated integration job and samples
  haven't been run against the new pipe — unit + lint have. `implement-issue` treats this
  honestly: it requires a stated reason when integration coverage is skipped rather than
  claiming it.
- **The enforced gate is local, not CI.** `verify-trace.sh` blocks `git push` only on a
  machine where `.husky/pre-push` is installed (a one-time manual `cp`, since file tools can't
  write to `.husky/` here). It's a strong team-local nudge, not a substitute for branch
  protection on `nestjs/nest`. Preflight surfaces a warning when it isn't installed.
- **Cursor's runtime rule/skill firing** ("does this trigger on the right files") is grounded
  in current docs but only fully verifiable inside Cursor live.
