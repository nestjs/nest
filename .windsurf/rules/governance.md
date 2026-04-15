---
trigger: always_on
description: Governance rules for @nestjs/core — compiled from governance.md by crag
---

# Windsurf Rules — @nestjs/core

Generated from governance.md by crag. Regenerate: `crag compile --target windsurf`

## Project

Modern, fast, powerful node.js web framework

**Stack:** node, express, typescript, fastify

## Runtimes

node

## Cascade Behavior

When Windsurf's Cascade agent operates on this project:

- **Always read governance.md first.** It is the single source of truth for quality gates and policies.
- **Run all mandatory gates before proposing changes.** Stop on first failure.
- **Respect classifications.** OPTIONAL gates warn but don't block. ADVISORY gates are informational.
- **Respect path scopes.** Gates with a `path:` annotation must run from that directory.
- **No destructive commands.** Never run rm -rf, dd, DROP TABLE, force-push to main, curl|bash, docker system prune.
- - No hardcoded secrets — grep for sk_live, AKIA, password= before commit
- Follow the project commit conventions.

## Quality Gates (run in order)

1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm run test`
4. `npm run build`
5. `sudo npm install -g npm@^9`
6. `npm run test:cov`
7. `npm run coverage`
8. `npm run lint:ci`
9. `npm run test:integration`
10. `npm run build:samples`
11. `npm run format  # from CONTRIBUTING.md`

## Rules of Engagement

1. **Minimal changes.** Don't rewrite files that weren't asked to change.
2. **No new dependencies** without explicit approval.
3. **Prefer editing** existing files over creating new ones.
4. **Always explain** non-obvious changes in commit messages.
5. **Ask before** destructive operations (delete, rename, migrate schema).

---

**Tool:** crag — https://www.npmjs.com/package/@whitehatd/crag
