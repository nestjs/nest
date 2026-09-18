# `@nestjs/transaction`

Declarative, adapter-agnostic database transaction management for Nest, via
a `@Transactional()` method decorator and an `AsyncLocalStorage`-backed
context that propagates across `await` boundaries without threading a
connection/session object through every function call.

This document describes the public API. See the inline TSDoc on each symbol
(`transaction.module.ts`, `transactional.decorator.ts`, etc.) for the
authoritative reference — this file is the narrative walkthrough.

## Why

Nest has no first-party answer for "run this across several repository
calls as one atomic unit, regardless of which ORM I'm using." Today, people
either:

- reach for ORM-specific APIs directly (e.g. TypeORM's `QueryRunner` /
  `DataSource.transaction()`) and thread the manager/session through every
  method by hand, or
- depend on community packages (`nestjs-cls` + its transactional plugin,
  `typeorm-transactional-cls-hooked`, etc.) that are excellent but tied to
  one ORM's shape and maintained outside the framework.

`@nestjs/transaction` provides the framework-level piece — *when* a
transaction begins, commits, rolls back, and how that fact is visible to
code running inside it — behind a small adapter interface that any ORM or
driver can implement.

## Installation & setup

```bash
npm install @nestjs/transaction
```

Register an adapter once, at the root (or any) module:

```typescript
import { Module } from '@nestjs/common';
import { TransactionModule } from '@nestjs/transaction';
import { TypeOrmTransactionAdapter } from './typeorm-transaction.adapter';

@Module({
  imports: [
    TransactionModule.forRoot({
      adapter: TypeOrmTransactionAdapter,
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

Async registration (when the adapter needs a dependency resolved through
another module, e.g. a `DataSource`):

```typescript
TransactionModule.forRootAsync({
  imports: [TypeOrmModule],
  useFactory: (dataSource: DataSource) =>
    new TypeOrmTransactionAdapter(dataSource),
  inject: [DataSource],
});
```

`@nestjs/transaction` ships **no adapters** — the core package has zero ORM
or driver dependencies by design. You bring (or publish) an adapter that
implements `TransactionAdapter`. A complete TypeORM reference
implementation lives in this repo's integration tests:
`integration/transaction/src/typeorm-transaction.adapter.ts`.

## Usage

```typescript
import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs/transaction';

@Injectable()
export class OrderService {
  constructor(private readonly orders: OrdersRepository) {}

  @Transactional()
  async createOrderPair(skuA: string, skuB: string): Promise<void> {
    await this.orders.insert(skuA);
    await this.orders.insert(skuB); // if this throws, both inserts roll back
  }
}
```

With the default `propagation: 'REQUIRED'`, calling `createOrderPair`:
1. starts a transaction if none is active yet, or joins the caller's
   transaction if one already is (exactly one `BEGIN`/`COMMIT` per call
   chain — nested `@Transactional()` calls are no-ops at this layer);
2. commits on success;
3. rolls back and re-throws the *original* error on failure — exception
   filters and callers still see the real error type.

### Checking transaction state: `TransactionHost`

```typescript
@Injectable()
export class OrderService {
  constructor(private readonly transactionHost: TransactionHost) {}

  log() {
    if (this.transactionHost.isActive()) { /* ... */ }
  }
}
```

The same check is available without DI (queue processors, cron jobs, plain
functions) via the static `TransactionHost.isActive()` /
`TransactionHost.getContext()` — both read the same `AsyncLocalStorage`, so
there's one source of truth either way. `getContext()` returns a
`TransactionContext` (`{ id, parent? }`) — deliberately minimal, with no
database connection/session exposed, so the core stays adapter-agnostic.

### Propagation modes

| Mode | Behavior |
| --- | --- |
| `REQUIRED` (default) | Join the active transaction, or start a new one. |
| `MANDATORY` | Require an active transaction; throws `MissingTransactionContextError` otherwise. Use for methods that must never be called outside a caller's transaction. |
| `NEVER` | Require *no* active transaction; throws `UnexpectedTransactionContextError` otherwise. Use for methods with non-transactional side effects that must fail loudly if pulled into someone else's transaction. |

`REQUIRES_NEW` / `NOT_SUPPORTED` are **not implemented** in this version —
both require suspending the active transaction (running an independent one,
possibly on a separate connection, while the outer one is paused), which
`TransactionAdapter` doesn't model yet. They're left out of the
`TransactionPropagation` union rather than shipped half-working;
`TransactionContext.parent` is already in place so they can be added later
without a breaking change.

### Writing an adapter

```typescript
interface TransactionAdapter<TBeginOptions = unknown> {
  begin(options?: TBeginOptions): Promise<TransactionContext>;
  runInTransaction<T>(context: TransactionContext, fn: () => Promise<T> | T): Promise<T>;
  commit(context: TransactionContext): Promise<void>;
  rollback(context: TransactionContext): Promise<void>;
}
```

- `begin()` opens the transaction (e.g. `BEGIN`) and returns an opaque
  `TransactionContext` identifying it.
- `runInTransaction()` runs `fn`, making the transaction reachable to
  whatever repositories/queries run inside it — typically by binding the
  adapter's own connection/session to its own `AsyncLocalStorage`, keyed by
  `context.id`. This is separate from `begin()` because *whether* to
  join/start (propagation) is core's job, while *how* a session reaches
  application code is entirely adapter-specific.
- `commit()` / `rollback()` are each called exactly once, on the success
  and failure paths respectively.

The reference `TypeOrmTransactionAdapter`
(`integration/transaction/src/typeorm-transaction.adapter.ts`) shows the
full pattern end to end: a `QueryRunner` per transaction, keyed by
`context.id`, with its `EntityManager` bound to a private
`AsyncLocalStorage` that repositories read via `adapter.getManager()`.

## Errors

All errors extend `TransactionError` and carry `.cause` where relevant:

- `MissingTransactionAdapterError` — `@Transactional()` used with no adapter
  registered.
- `MissingTransactionContextError` — `MANDATORY` called with no active
  transaction.
- `UnexpectedTransactionContextError` — `NEVER` called inside an active
  transaction.
- `TransactionCommitError` — `adapter.commit()` threw; `.cause` is the
  underlying error.
- `TransactionRollbackError` — the decorated method threw **and**
  `adapter.rollback()` also threw; `.originalError` is the method's error,
  `.cause` is the rollback failure. Neither error is swallowed.

## Known limitations (by design, for this initial version)

- **One adapter per process.** Re-importing `TransactionModule.forRoot()`
  replaces the previously registered adapter rather than namespacing it.
  Multiple named adapters (e.g. a secondary reporting database) is a
  natural follow-up, deliberately left out to keep the initial surface
  small.
- **No savepoints.** A nested `@Transactional()` call joins the outer
  transaction and cannot roll back independently of it.
- **`Promise.all()` is not transaction-safe by itself.** It only affects
  how JS awaits multiple promises; whether concurrent queries against one
  transaction context are safe depends entirely on the adapter/driver (most
  SQL drivers disallow concurrent queries on a single connection).
- **External side effects are not undone.** A transaction only ever rolls
  back database writes it manages. Calling an email/HTTP side effect inside
  a `@Transactional()` method is not reverted if the transaction later
  fails — reach for the outbox pattern if you need that.

## Testing

- Unit tests: `packages/transaction/test/*.spec.ts` — decorator propagation
  semantics, commit/rollback/error paths, module registration
  (`forRoot`/`forRootAsync`), and `TransactionHost`, all against a fake
  in-memory adapter/database (`test/utils/`) with no real DB dependency.
- Integration/e2e: `integration/transaction/e2e/transaction.spec.ts` proves
  real atomicity against a genuine TypeORM `DataSource` (pure-JS `sql.js`
  driver, so no external DB process is required) using the reference
  `TypeOrmTransactionAdapter`.

Run them with:

```bash
npx vitest run --config vitest.config.mts packages/transaction
npx vitest run --config vitest.config.integration.mts integration/transaction
```
