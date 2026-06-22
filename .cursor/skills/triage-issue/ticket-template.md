# [#<issue-number>] <title>

**Category:** Bug | Regression | Feature | Performance/Enhancement
**Trace ID:** #<issue-number>  **Branch:** `<type>/<issue-number>-<slug>`

## Problem
<1-3 sentences, in repo terms, linking the original issue.>

## Acceptance Criteria
- [ ] AC1 — Given … When … Then … → `packages/<pkg>/test/.../x.spec.ts :: "<it name>"`
- [ ] AC2 — …

## Proposed Solution
<approach + exact files, from `ARCHITECTURE.md` §4>

## Blast Radius & Difficulty  (source: `ARCHITECTURE.md` §3-4, not re-scored)
| Surface | Blast radius | Difficulty |
|---|---|---|
| `packages/<pkg>/...` | none / low / medium / high / very high | Trivial → Hard |

**Breaking change?** Yes/No — semver note if it touches `packages/common` public API.

## Existing Workarounds (estimate — from the issue thread/docs only; "none found" if none)

## Failing-Test Evidence (TDD red)
```
<paste of `npm run test` output showing the new spec failing, on this branch>
```

## Release Estimate (estimate, not a commitment)
- Tier: <Difficulty> → likely **patch / minor / major**
- Historical cadence on this repo: patch tags ~every 1-2 weeks, minor/major
  ~every 4-8 months (from `git tag` history) — maintainers still decide.
- Gates before merge: `npm run build`, `npm run test`, `npm run lint` (+
  `sh scripts/run-integration.sh` if routing/adapter/transport).

## Ownership Gate (advisory)
Non-tech ownable only if Trivial + none/low blast radius + `sample/*`/`*.md`
only. Otherwise engineer required.
→ Verdict: <Non-tech ownable | Engineer required> — <one-line reason>.
