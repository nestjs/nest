---
name: http-request-chain
description: >-
  Plan and implement cross-cutting HTTP request lifecycle changes (middleware,
  guards, interceptors, pipes, filters). Use when modifying request ordering,
  orchestration in core/router, or aligning HTTP with RPC/WebSocket context.
---

# HTTP Request Chain Changes

**Difficulty:** Hard — see [ARCHITECTURE.md](../../../ARCHITECTURE.md) §2a (lifecycle diagram) and §4 (cheat sheet).

Also read: [CONTRIBUTING.md](../../../CONTRIBUTING.md) for discussion issues and PR gates.

## Before coding

1. Open a `[discussion]` issue — request-chain changes are semver-sensitive.
2. Define scope: ordering vs new stage vs shared context vs error propagation.
3. Confirm what stays stable: public decorators, documented lifecycle order ([request-lifecycle FAQ](https://docs.nestjs.com/faq/request-lifecycle)).
4. Decide whether RPC (`microservices`) and WebSocket gateways must match HTTP.

Additive changes can ship incrementally. Reordering documented behavior needs a major release and migration notes.

## Touch points (grep symbols; do not browse the whole repo)

| Layer | Primary files |
|-------|---------------|
| Orchestration | `packages/core/router/router-execution-context.ts` |
| Consumers | `packages/core/guards/guards-consumer.ts`, `interceptors/interceptors-consumer.ts`, pipes context creators |
| Middleware | `packages/core/middleware/middleware-module.ts` |
| Response / errors | `router-response-controller.ts`, `exceptions/exceptions-handler.ts`, `router-exception-filters.ts` |
| Route registration | `router-explorer.ts`, `routes-resolver.ts` |
| Non-HTTP parity | `packages/core/helpers/external-context-creator.ts` |
| Contracts | `packages/common/interfaces/*`, `packages/common/decorators/` |
| Adapters | `platform-express`, `platform-fastify` (entry/exit only) |

Pipes run inside the handler passed to `InterceptorsConsumer.intercept()` — moving pipes before interceptors changes how the handler is nested, not a one-line tweak.

## Package order of work

```
common (interfaces, decorators) → core (orchestration) → microservices / websockets → platform-* → testing
```

1. **common** — additive interfaces, metadata keys, optional decorator options only.
2. **core** — orchestration in `RouterExecutionContext` + consumers; prefer flags or new code paths.
3. **microservices / websockets** — align `ExternalContextCreator` if parity is required.
4. **platform-*** — only if entry/response serialization changes; keep Express/Fastify parity.
5. **testing** — update harness if global registration or lifecycle hooks change.

Never import `core` from `common`.

## Phased delivery

| Phase | Goal |
|-------|------|
| A | Internal refactor, no behavior change — extract shared pipeline used by `RouterExecutionContext` and `ExternalContextCreator`; existing specs stay green |
| B | Additive behavior — new stage/context/opt-in decorator; old path unchanged |
| C | Behavior change — document breaking change, migration guide, major bump if needed |

Avoid touching `common/interfaces` and `core/injector` in the same PR unless unavoidable.

## Tests

| Level | Where |
|-------|-------|
| Unit consumers | `packages/core/test/guards/guards-consumer.spec.ts`, `interceptors-consumer.spec.ts`, `router-execution-context.spec.ts`, `external-context-creator.spec.ts` |
| Unit contracts | `packages/common/test/` (mirrors source tree; never colocated with the `.ts` it tests) |
| Integration ordering | `integration/hello-world/e2e/guards.spec.ts`, `interceptors.spec.ts` |
| Scopes / hooks | `integration/scopes/e2e/*`, `integration/hooks/e2e/lifecycle-hook-order.spec.ts` |

When changing ordering, add **explicit ordering tests** (stage X before Y), not just outcome tests.

Full gates: `npm run build`, `npm run test`, `npm run lint`, then `sh scripts/run-integration.sh` for routing changes.

## PR hygiene

- Split PRs when possible: `common` → `core` → integration → docs.
- Commit scopes: `common,core` when both change.
- Samples: only if demonstrating new API; do not refactor all samples.
- Update public lifecycle docs if ordering changes.

## Red flags (pause and redesign)

- Reordering documented stages without a major release plan
- Changing `ExecutionContext` shape used by user guards/interceptors
- Diverging HTTP vs RPC vs WebSocket without explicit rationale
- One PR touching `injector`, `router`, and `common/interfaces` together
- Skipping integration tests for routing changes

## Workflow

```
discussion issue → grep touch points → common (additive) → core refactor (no behavior)
  → core feature (flagged) → ExternalContextCreator parity → unit + integration tests → split PRs
```

Use the `build-and-verify` and `run-integration-tests` skills for commands to run.
