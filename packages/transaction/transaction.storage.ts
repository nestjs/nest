import { AsyncLocalStorage } from 'node:async_hooks';
import { TransactionContext } from './interfaces/transaction-context.interface.js';

/**
 * Propagates the active {@link TransactionContext} across `await`
 * boundaries using `AsyncLocalStorage`.
 *
 * This is internal to `@nestjs/transaction`: application and adapter code
 * should read the active context through {@link TransactionHost}, not this
 * module directly. Keeping a single `AsyncLocalStorage` instance here (module
 * scope, not a class field) means it is only ever touched by
 * `runTransactional()` — a method with no `@Transactional()` anywhere in its
 * call chain never creates a store and pays no overhead for one.
 */
class TransactionStorageHost {
  private readonly storage = new AsyncLocalStorage<TransactionContext>();

  getStore(): TransactionContext | undefined {
    return this.storage.getStore();
  }

  run<T>(context: TransactionContext, fn: () => T): T {
    return this.storage.run(context, fn);
  }
}

export const TransactionStorage = new TransactionStorageHost();
