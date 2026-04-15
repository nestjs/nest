<!-- crag:auto-start -->
# GEMINI.md

> Generated from governance.md by crag. Regenerate: `crag compile --target gemini`

## Project Context

- **Name:** @nestjs/core
- **Description:** Modern, fast, powerful node.js web framework
- **Stack:** node, express, typescript, fastify
- **Runtimes:** node

## Rules

### Quality Gates

Run these checks in order before committing any changes:

1. [lint] `npm run lint`
2. [lint] `npx tsc --noEmit`
3. [test] `npm run test`
4. [build] `npm run build`
5. [ci (inferred from workflow)] `sudo npm install -g npm@^9`
6. [ci (inferred from workflow)] `npm run test:cov`
7. [ci (inferred from workflow)] `npm run coverage`
8. [ci (inferred from workflow)] `npm run lint:ci`
9. [ci (inferred from workflow)] `npm run test:integration`
10. [ci (inferred from workflow)] `npm run build:samples`
11. [contributor docs (advisory — confirm before enforcing)] `npm run format  # from CONTRIBUTING.md`

### Security

- No hardcoded secrets — grep for sk_live, AKIA, password= before commit

### Workflow

- Follow project commit conventions
- Run quality gates before committing
- Review security implications of all changes

<!-- crag:auto-end -->
