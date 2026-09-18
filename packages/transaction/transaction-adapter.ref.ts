import { TransactionAdapter } from './interfaces/transaction-adapter.interface.js';

/**
 * Holds the process-wide {@link TransactionAdapter} that `@Transactional()`
 * uses.
 *
 * `@Transactional()` decorates a method at class-definition time, long
 * before any Nest `ModuleRef`/DI container exists, and it must keep working
 * for plain method calls that never go through Nest's request pipeline
 * (queue processors, cron jobs, direct service calls — see
 * `TransactionModule`'s docs). That rules out resolving the adapter through
 * DI at call time the way a guard/interceptor/pipe would.
 *
 * Instead, `TransactionModule` resolves the configured adapter through Nest
 * DI *once* (so the adapter itself can have constructor dependencies, e.g. a
 * `DataSource`) and publishes the resulting instance here on `onModuleInit`.
 * This is the same trade-off used by other libraries that need a decorator
 * to reach a DI-managed singleton outside of Nest's own pipeline.
 *
 * Only one adapter is supported per process in this version — see
 * `TransactionModule` for why, and how a future "named adapters" API could
 * extend this without breaking the current one.
 */
class TransactionAdapterRegistry {
  private adapter: TransactionAdapter | undefined;

  set(adapter: TransactionAdapter): void {
    this.adapter = adapter;
  }

  /**
   * Clears the registered adapter, but only if it is still the instance
   * passed in. This matters when a module is torn down (e.g. between tests):
   * without the identity check, module B's `onModuleDestroy` could wipe out
   * module A's adapter if A re-registered after B started.
   */
  clear(adapter: TransactionAdapter): void {
    if (this.adapter === adapter) {
      this.adapter = undefined;
    }
  }

  get(): TransactionAdapter | undefined {
    return this.adapter;
  }
}

export const TransactionAdapterRef = new TransactionAdapterRegistry();
