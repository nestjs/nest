<!-- crag:auto-start -->
# Amazon Q Rules — @nestjs/core

> Generated from governance.md by crag. Regenerate: `crag compile --target amazonq`

## About

Modern, fast, powerful node.js web framework

**Stack:** node, express, typescript, fastify

**Runtimes detected:** node

## How Amazon Q Should Behave on This Project

### Code Generation

1. **Run governance gates before suggesting commits.** The gates below define the quality bar.
2. **Respect classifications:** MANDATORY (default) blocks on failure; OPTIONAL warns; ADVISORY is informational only.
3. **Respect scopes:** Path-scoped gates run from that directory. Conditional gates skip when their file does not exist.
4. **No secrets.** - No hardcoded secrets — grep for sk_live, AKIA, password= before commit
5. **Minimal diffs.** Prefer editing existing code over creating new files. Do not refactor unrelated areas.

### Quality Gates

- `npm run lint`
- `npx tsc --noEmit`
- `npm run test`
- `npm run build`
- `sudo npm install -g npm@^9`
- `npm run test:cov`
- `npm run coverage`
- `npm run lint:ci`
- `npm run test:integration`
- `npm run build:samples`
- `npm run format  # from CONTRIBUTING.md`

### Commit Style

Follow project commit conventions.

### Boundaries

- All file operations must stay within this repository.
- No destructive shell commands (rm -rf above repo root, DROP TABLE without confirmation, force-push to main).
- No new dependencies without an explicit reason.

## Authoritative Source

When these instructions seem to conflict with something in the repo, **`.claude/governance.md` is the source of truth**. This file is a compiled view.

---

**Tool:** crag — https://www.npmjs.com/package/@whitehatd/crag

<!-- crag:auto-end -->
