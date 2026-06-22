# AI-Agent Enablement Review — `nestjs/nest`

Review of the `.cursor/` rules, skills, hooks, and supporting docs (ARCHITECTURE.md,
DESIGN.md, docs/DEVELOPER.md) added to make this repo AI-agent-friendly.

---

## 1. Overall assessment

The setup is genuinely well-architected and unusually disciplined. The strongest design
decision is that **rules and skills reference source-of-truth docs instead of copying
them** ("pull verbatim from ARCHITECTURE.md §3-4, don't re-score"). That is exactly what
keeps an agent context accurate over time and is the right call for your north star.

Layering is sound:

- **One** always-apply rule (`00-index.mdc`, 16 lines) — minimal always-on context.
- **Per-package, glob-scoped** rules that only load when relevant files are touched.
- **Agent-invoked skills** for workflows (triage, build, commit, conformance).
- **A real enforced gate** (`verify-trace.sh` via husky pre-push) — not just advisory.
- **Context-budget hygiene** via `.cursorignore` + the `guard-read.sh` read hook.

The conformance script actually works and produces real signal — it flagged 4 genuinely
missing specs (`intrinsic.exception.ts`, `base-rpc-exception-filter.ts`,
`kafka-retriable-exception.ts`, `serialize-options.decorator.ts`). That alone proves the
"bring CI knowledge earlier" thesis.

The issues below are mostly drift, gaps against your stated goals, and a few duplication
hotspots — not structural problems.

---

## 2. Highest-priority gaps

### 2.1 `scaffold-contribution` still missing (design gap, not doc drift)

DESIGN.md now describes the shipped skills-based system (`triage-issue` →
`implement-issue` → `commit-and-pr` plus leaf skills). The remaining gap is procedural,
not documentary: **`ParsePositiveIntPipe` is the reference onboarding exercise** (rules
model it; it is not checked into `packages/` so agents can implement it fresh), but nothing
yet automates "find sibling → write impl + mirrored spec + barrel export."

**Recommendation:** build the `scaffold-contribution` skill (see 2.2) so Goal 2 is not
assembled ad hoc from `pipes.mdc` et al.

### 2.2 No "scaffold a first contribution" skill — Goal 2's core is missing

You have skills for *triage* (plan), *build*, *commit*, *conformance*, and *integration
tests*, plus an `http-request-chain` planning skill. The missing middle is the actual
**"create the impl + mirrored spec + barrel export, modeled on the nearest sibling"**
generator. Right now an agent assembles that ad hoc from `pipes.mdc` etc.

**Recommendation:** add a `scaffold-contribution` skill that: picks the target package →
finds the nearest sibling as a template → writes impl + mirrored spec + barrel export →
runs `check-conformance` + lint/test. This is the single highest-leverage addition for
Goal 2 and directly serves the "accuracy on every PR + reuse details" north star.

### 2.3 Goal 3 (PM / QA / DevOps) is barely served

Goal 3 and DESIGN.md requirement 5 ("multi-audience renderings of the same change") have
**no dedicated mechanism**. The only artifact that comes close is `triage-issue`'s
`ticket-template.md`, which happens to contain PM-ish (Problem), QA-ish (Acceptance
Criteria), and DevOps-ish (Gates/Release estimate) sections — but it's a *triage* ticket,
not a per-PR change summary, and it's not framed for those audiences.

**Recommendation:** make the three-audience output a concrete step — either folded into the
scaffold/commit-and-pr skill or a small `change-summary` skill that emits a PM summary
(plain language, no code), a QA block (test list + edge cases covered/not), and a DevOps
block (which CI jobs the diff touches: Node matrix? Docker integration job? samples
rebuild?). You already enumerated exactly this in DESIGN.md §5 — it just needs to exist.

### 2.4 Everything is Cursor-only — no Claude / Claude Code surface

You said you're using "Cursor and Claude," and you're reviewing this *in Claude right now*,
but the entire investment lives under `.cursor/` (`rules/*.mdc`, `skills/*/SKILL.md`,
`hooks/`). Claude Code does **not** read `.cursor/rules` or auto-load `.cursor/skills`; it
looks for `CLAUDE.md` / `AGENTS.md` and `.claude/`. So none of this guidance reaches Claude
automatically today.

Also worth verifying: `.cursor/skills/*/SKILL.md` uses the **Agent Skills** format
(`name`/`description` frontmatter). Cursor's first-class primitive is `.cursor/commands/`;
confirm Cursor actually auto-discovers `.cursor/skills/` in your version, otherwise these
are effectively just markdown the agent reads only when pointed at them.

**Recommendation:** add a thin `AGENTS.md` (or `CLAUDE.md`) at repo root that points to
ARCHITECTURE.md / DEVELOPER.md / CONTRIBUTING.md and lists the skills — `AGENTS.md` is read
by both Cursor and Claude Code, so it's the cheapest way to make the work portable. Keep
the source-of-truth docs tool-agnostic (they already are) and let each tool's thin entry
file point into them.

---

## 3. Duplication & context-overload analysis

You asked specifically whether duplicated rules/skills could overload the agent context.
**Short answer: the always-on footprint is small and safe; the duplication that exists is
mostly mechanical (npm commands) and mostly harmless because of glob scoping.**

What's actually always-on: only `00-index.mdc` (16 lines). Per-package rules and skills
load on demand. This is the right design and is *not* an overload risk.

Genuine duplication, ranked:

1. **npm build/test/lint command blocks** are restated in ~5 places: `docs/DEVELOPER.md`,
   `build-and-verify`, `commit-and-pr`, `run-integration-tests`, and `ARCHITECTURE.md §5`.
   The skills do link to DEVELOPER.md but also re-list the commands. This is the worst
   offender for drift (change a script name and you edit 5 files). *Recommendation:* let
   `build-and-verify` own the command list; have the others link to it rather than restate.

2. **Block/ignore lists in 3 mechanisms**: `.cursorignore`, `guard-read.sh`, and
   `00-index.mdc`'s "Do not read" all enumerate `node_modules`, `dist`, `*.d.ts`, etc.
   This is defense-in-depth (indexer vs runtime hook vs agent instruction) so it's
   *defensible*, but the three lists can drift apart. *Recommendation:* keep all three but
   add a one-line comment in each pointing to the others as the canonical trio.

3. **The shared-`ContextCreator` paragraph** is repeated nearly verbatim in `guards.mdc`,
   `interceptors.mdc`, `exception-filters.mdc`, and `decorators.mdc`. Because these are
   glob-scoped, normally only one loads — so this is **not** a context-overload problem and
   the repetition is arguably good (each rule is self-contained). Leave as-is.

4. **Lifecycle ordering** appears in `ARCHITECTURE.md §2a` and is restated in `guards.mdc`,
   `interceptors.mdc`, and the `http-request-chain` skill. Minor; acceptable since each
   states only the one-line position relevant to its concept.

Net: no rule/skill combination produces a dangerous context blow-up. The thing to fix is
**single-sourcing the npm commands**, not the conceptual rules.

---

## 4. Smaller correctness / consistency issues

- **Commit metadata is slightly out of sync with `commitlint`.** `commit-and-pr` and
  `packages.mdc` list types missing `revert` and `sample` (both are in
  `.commitlintrc.json` `type-enum`), and omit the `release` scope. `subject-case` in
  commitlint allows sentence/start/pascal/upper/lower case — the skill says only
  "imperative, present tense," which is fine but under-specifies. Align the skill's lists
  with `.commitlintrc.json` so an agent doesn't author a commit the hook then rejects.

- **`.cursor/.99999.md.discard`** is a stray file (looks like leftover failing-test
  evidence). Remove it or move it into the triage flow; stray dotfiles in `.cursor/`
  invite confusion.

- **`.cursor/triage/` is empty** and only created at runtime. `verify-trace.sh` depends on
  the exact path `.cursor/triage/<issue>.md`. Consider a `.gitkeep` + a one-line README so
  the contract is discoverable without reading the script.

- **`pre-push` is not installed** (`.husky/pre-push` is absent). This is intentional per the
  skill (file-write to `.husky/` is blocked in this environment), but it means the "one
  enforced gate" is currently *not active*. The README/onboarding should make the one-time
  `cp .cursor/skills/triage-issue/pre-push.sh .husky/pre-push` step impossible to miss for a
  new engineer, or it silently isn't enforced.

---

## 5. Recommendations, prioritized

1. **Build the `scaffold-contribution` skill** (Goal 2 core; highest leverage). — *new*
2. **Add a `change-summary` step/skill for PM/QA/DevOps output** (Goal 3). — *new*
3. **Reconcile DESIGN.md with the shipped skills-based system** — *done in this commit*.
4. **Add `AGENTS.md` at repo root** so the work reaches Claude/Claude Code, not just Cursor. — *new*
5. **Single-source the npm command blocks** into `build-and-verify`; link from the rest. — *edit*
6. **Align `commit-and-pr` / `packages.mdc` commit types & scopes with `.commitlintrc.json`.** — *edit*
7. **Make the `pre-push` install step prominent** in onboarding (the only real gate). — *edit*
8. **Housekeeping:** remove `.99999.md.discard`, `.gitkeep` for `.cursor/triage/`, confirm no
   compiled `.js/.d.ts` are committed. — *edit*

Items 1–4 advance your goals and north star directly; 5–8 are hygiene that reduces drift
and keeps the agent's context accurate.

---

## 6. On the "future" north star (reduce PR time by moving CI knowledge earlier)

You're already most of the way there conceptually: `check-conformance` mirrors the
"specs mirror source" CI expectation, and `verify-trace.sh` gates on it pre-push. To
actually shorten PR cycle time, the two missing links are (a) running the *real* gates
(`build`/`test`/`lint`) automatically as part of the scaffold/triage flow rather than
leaving them as a checklist, and (b) closing the Docker gap — every doc honestly notes
integration tests haven't been run locally, which is the one class of failure most likely
to surface only in CI. Wiring `run-integration-tests` into the definition of "done" for
routing/adapter/transport changes (even if it just hard-stops with "Docker required") would
catch the highest-latency CI failures before push.
