# Governance — @nestjs/core
# Inferred by crag analyze — review and adjust as needed

## Identity
- Project: @nestjs/core
- Description: Modern, fast, powerful node.js web framework
- Stack: node, express, typescript, fastify
- Workspace: subservices

## Gates (run in order, stop on failure)
### Lint
- npm run lint
- npx tsc --noEmit

### Test
- npm run test

### Build
- npm run build

### CI (inferred from workflow)
- sudo npm install -g npm@^9
- npm run test:cov
- npm run coverage
- npm run lint:ci
- npm run test:integration
- npm run build:samples

### Contributor docs (ADVISORY — confirm before enforcing)
- npm run format  # from CONTRIBUTING.md

## Advisories (informational, not enforced)
- actionlint  # [ADVISORY]

## Branch Strategy
- Trunk-based development
- Free-form commits
- Commit trailer: Co-Authored-By: Claude <noreply@anthropic.com>

## Security
- No hardcoded secrets — grep for sk_live, AKIA, password= before commit

## Autonomy
- Auto-commit after gates pass

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

## Dependencies
- Package manager: npm (package-lock.json)
- Node: >= 20

## Import Conventions
- Module system: CJS

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

