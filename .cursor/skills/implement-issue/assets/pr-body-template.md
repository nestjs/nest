<!--
  PR body skeleton for the implement-issue skill.
  Render this FROM .cursor/triage/<issue>.md — don't recompute facts the ticket already holds.
  It mirrors the repo's .github/PULL_REQUEST_TEMPLATE.md structure: fill the sections, don't
  restructure them. The QA and DevOps sub-blocks are this repo's Goal-3 additions (one source,
  three audiences) and sit inside the template's existing sections.
-->

## PR Checklist
- [ ] The commit message follows our guidelines (see the `commit-and-pr` skill)
- [ ] Tests for the changes have been added (for bug fixes / features)
- [ ] Docs have been added / updated (for bug fixes / features)

## PR Type
<!-- check the one that applies -->
- [ ] Bugfix
- [ ] Feature
- [ ] Code style update (formatting, local variables)
- [ ] Refactoring (no functional changes, no api changes)
- [ ] Build related changes
- [ ] CI related changes
- [ ] Other... Please describe:

## What is the current behavior?
<!-- PM-readable: the problem in plain language, no code. From the ticket's "Problem" section. -->

Issue Number: #<issue>
<!-- Trace ID per lifecycle-trace.mdc. Never leave this at N/A when a real issue exists.
     If no issue exists yet for a major/breaking change, link the [discussion] issue instead. -->

## What is the new behavior?
<!-- Decision record (lifecycle-trace.mdc): what changed and *why*, plus the files actually
     touched. From the ticket's "Proposed Solution" + as-built file list. For Hard /
     high-blast-radius changes this section is the only durable design record — write it as one. -->

**QA — tests covering this change**
<!-- From the ticket's Acceptance Criteria, now green. -->
- `<spec path> :: "<it name>"` — Given … When … Then …
- Edge cases covered: …
- Edge cases not covered (and why it's acceptable): …

## Does this PR introduce a breaking change?
- [ ] Yes
- [ ] No
<!-- If it touches packages/common public API, add the semver note here. -->

## Other information

**DevOps / rollout** <!-- see references/devops-and-rollback.md for how to fill this -->
- CI jobs this diff exercises: <Node-version unit matrix? Docker `integration_tests`? samples rebuild?>
- Release tier: <patch | minor | major> (from the triage difficulty, ARCHITECTURE.md §3-4)
- Rollback: `git revert <SHA>` + patch release / version pin — affected transports/adapters/consumers: <…>
  <!-- nestjs/nest is a library: rollback = revert + release, not a runtime feature flag. -->
