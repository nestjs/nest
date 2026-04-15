<!-- crag:auto-start -->
# AGENTS.md

> Generated from governance.md by crag. Regenerate: `crag compile --target agents-md`

## Project: @nestjs/core

Modern, fast, powerful node.js web framework

## Quality Gates

All changes must pass these checks before commit:

### Lint
1. `npm run lint`
2. `npx tsc --noEmit`

### Test
1. `npm run test`

### Build
1. `npm run build`

### Ci (inferred from workflow)
1. `sudo npm install -g npm@^9`
2. `npm run test:cov`
3. `npm run coverage`
4. `npm run lint:ci`
5. `npm run test:integration`
6. `npm run build:samples`

### Contributor docs (advisory — confirm before enforcing)
1. `npm run format  # from CONTRIBUTING.md`

## Coding Standards

- Stack: node, express, typescript, fastify
- Follow project commit conventions

## Architecture

- Type: microservices
- Services: common, core, microservices, platform-express, platform-fastify, platform-socket.io, platform-ws, testing, websockets

## Key Directories

- `.circleci/` — CI/CD
- `.github/` — CI/CD
- `integration/` — tests
- `packages/` — workspace packages
- `scripts/` — tooling
- `tools/` — tooling

## Testing

- Framework: mocha
- Layout: flat

## Code Style

- Formatter: prettier
- Linter: eslint

## Anti-Patterns

Do not:
- Do not leave `console.log` in production code — use a proper logger
- Do not use synchronous filesystem APIs in request handlers
- Do not use `any` type — use `unknown` or proper types instead
- Do not use `@ts-ignore` — fix the type error or use `@ts-expect-error` with a reason
- Prefer `as const` over `enum` for string unions

## Framework Conventions

- Express
- Use async middleware with error handling — pass errors to next()
- Use GraphQL schema-first or code-first approach consistently

## Security

- No hardcoded secrets — grep for sk_live, AKIA, password= before commit

## Workflow

1. Read `governance.md` at the start of every session — it is the single source of truth.
2. Run all mandatory quality gates before committing.
3. If a gate fails, fix the issue and re-run only the failed gate.
4. Use the project commit conventions for all changes.

<!-- crag:auto-end -->
