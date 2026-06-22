---
name: commit-and-pr
description: >-
  NestJS conventional commit format, scopes, pre-PR verification gates, and the
  GitHub (gh) PR/issue workflow. Use when committing changes or preparing a pull request.
---

# Commit and PR

Full details: [CONTRIBUTING.md](../../../CONTRIBUTING.md) and
[docs/DEVELOPER.md](../../../docs/DEVELOPER.md#github-cli-and-contribution-workflow).

## Pre-PR gates

Run the gates via the `build-and-verify` skill (build + unit tests + lint) — that skill is the
single source of truth for these commands, so they aren't restated here. For routing, adapter,
or transport changes, also run the `run-integration-tests` skill (Docker).

Implementing a triaged issue? The `implement-issue` skill runs all of these as its
definition-of-done and renders the PR body before handing off here — this skill then owns only
the conventional commit and the `gh` PR/issue mechanics.

Triaging from a GitHub issue rather than a self-found fix? Use the `triage-issue` skill first —
its ticket + failing-test evidence at `.cursor/triage/<issue>.md` are what `.husky/pre-push`
(`verify-trace.sh`) actually checks before letting `git push` through on a matching branch name.

## Commit format

```
<type>(<scope>): <subject>
```

Types (per `.commitlintrc.json` `type-enum`): `build`, `chore`, `ci`, `docs`, `feat`, `fix`,
`perf`, `refactor`, `revert`, `style`, `test`, `sample`.

Scopes (per `.commitlintrc.json` `scope-enum`): `common`, `core`, `sample`, `microservices`,
`express`, `fastify`, `socket.io`, `ws`, `testing`, `websockets`, `release`. Multi-package:
`common,core`. Samples: `sample/#`.

Examples:

```
fix(core): resolve circular dependency in scoped provider
test(common): add parse-positive-int pipe edge cases
docs(sample/01): update cats app readme
```

- Imperative, present tense; no trailing period; max 100 chars per line. Subject case must be
  one of commitlint's allowed cases (sentence / start / pascal / upper / lower) — a lower-case
  imperative subject satisfies this.
- Major features need a `[discussion]` issue first.
- Format code: `npm run format` (or rely on afterFileEdit prettier hook).

## Create PR / issues with `gh`

Use the GitHub CLI (preferred over a GitHub MCP server in this repo). Pull/push is plain
`git`; `gh` handles PRs, issues, and CI status. Push to a **fork** — direct pushes to
`nestjs/nest` are not allowed.

```bash
gh repo fork nestjs/nest --remote    # one-time: add your fork as a remote
git checkout -b fix/my-change master
git push -u origin fix/my-change
gh pr create --fill                  # PR against nestjs:master
gh issue create                      # file a bug / feature request
gh pr checks                         # CI status for the current branch
```

Install/auth: see [docs/DEVELOPER.md](../../../docs/DEVELOPER.md#github-cli-and-contribution-workflow)
(`gh auth login` needs a browser; run it in your own terminal).
