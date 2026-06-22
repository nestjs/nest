# DevOps / rollout block — how to fill it

Loaded on demand by the `implement-issue` skill when rendering the PR body. The goal is to
make a change legible to DevOps **without reading the diff**, reusing what the triage ticket
already carries (blast radius, gates, release tier) — render, don't recompute.

## CI jobs this diff exercises

Map the touched paths to the CircleCI pipeline
(`build` → Node-version test matrix → `lint:ci` → `integration_tests` → `samples`):

- Any `packages/**` change → `build` + the Node-version **unit-test matrix** + lint.
- Routing, adapters, or microservice transports → **also** the Docker-gated
  `integration_tests` job. Run it locally first via the `run-integration-tests` skill.
- Public API consumed by samples, or a `sample/*` change → the **samples** build/test job;
  rebuild locally with `npm run build && npm run move:samples`.

State only the jobs the diff actually reaches, so a reviewer knows where CI risk concentrates.

## Release tier

Pull straight from the triage difficulty (ARCHITECTURE.md §3-4) — don't re-score:

- Trivial / Easy, additive in an isolated file → **patch**
- New opt-in feature / additive interface → **minor**
- Breaking change to `packages/common` public API, or request-lifecycle ordering → **major**

Maintainers decide the actual tag; this is an estimate, matching the ticket's Release Estimate.

## Rollback

`nestjs/nest` is a **published library, not a deployed service**, so rollback is not a flag toggle:

- Rollback = `git revert <SHA>` followed by a patch release (or consumers pin the previous
  version). There is **no LaunchDarkly / runtime feature flag** in this repo.
- Name the transports / adapters / consumers that regress if the change is reverted, so a
  maintainer can see the blast radius of the revert itself.
- The repo's *forward* safety mechanism is the additive / opt-in / phased-delivery pattern
  (see the `http-request-chain` skill), not a runtime flag.

## Reusing this skill in an application repo (future)

If you point this same pipeline at one of your own **application** repos where rollout *is*
flag-gated, the rollback line is the designed extension slot: add the flag name, its default
state, and the kill-switch / runbook link. Keep the `nestjs/nest` version flag-free so the
library PR body stays accurate — don't add a flag field that's always "N/A" here.
