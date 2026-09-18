import {
  MissingTransactionAdapterError,
  MissingTransactionContextError,
  TransactionCommitError,
  TransactionRollbackError,
  UnexpectedTransactionContextError,
} from './errors/transaction.errors.js';
import { TransactionAdapter } from './interfaces/transaction-adapter.interface.js';
import { TransactionContext } from './interfaces/transaction-context.interface.js';
import { TransactionPropagation } from './interfaces/transaction-propagation.type.js';
import { TransactionAdapterRef } from './transaction-adapter.ref.js';
import { TransactionStorage } from './transaction.storage.js';

/**
 * Implements the transaction lifecycle and propagation semantics shared by
 * `@Transactional()`. Exported (rather than kept private to the decorator)
 * so other entry points — e.g. a future `TransactionInterceptor` — can reuse
 * the exact same behavior instead of re-implementing it.
 */
export async function runTransactional<T>(
  propagation: TransactionPropagation,
  fn: () => Promise<T> | T,
): Promise<T> {
  const activeContext = TransactionStorage.getStore();

  switch (propagation) {
    case 'MANDATORY':
      if (!activeContext) {
        throw new MissingTransactionContextError();
      }
      return fn();

    case 'NEVER':
      if (activeContext) {
        throw new UnexpectedTransactionContextError();
      }
      return fn();

    case 'REQUIRED':
      // Joining an existing transaction is a no-op at this layer: `fn` runs
      // directly, with the outer `AsyncLocalStorage` context (and the outer
      // adapter's `runInTransaction` binding) still in effect. Only the
      // outermost `@Transactional()` call ever begins/commits/rolls back.
      if (activeContext) {
        return fn();
      }
      return beginAndRun(fn);

    default:
      // Defensive: TransactionPropagation is a closed union, but nothing
      // stops a plain-JS caller from passing an unsupported string through.
      throw new TypeError(
        `Unsupported transaction propagation: "${propagation}"`,
      );
  }
}

async function beginAndRun<T>(fn: () => Promise<T> | T): Promise<T> {
  const adapter = TransactionAdapterRef.get();
  if (!adapter) {
    throw new MissingTransactionAdapterError();
  }

  const context = await adapter.begin();

  return TransactionStorage.run(context, () =>
    executeAndFinalize(adapter, context, fn),
  );
}

async function executeAndFinalize<T>(
  adapter: TransactionAdapter,
  context: TransactionContext,
  fn: () => Promise<T> | T,
): Promise<T> {
  let result: T;
  try {
    result = await adapter.runInTransaction(context, fn);
  } catch (error) {
    // Never commit after the method throws. Roll back instead, and — unless
    // rollback itself fails — re-throw the *original* error unchanged, so
    // callers/exception filters keep seeing the real error type (e.g. a
    // domain-specific `BadRequestException`).
    try {
      await adapter.rollback(context);
    } catch (rollbackError) {
      throw new TransactionRollbackError(error, rollbackError);
    }
    throw error;
  }

  // Never roll back after a successful run. `result` is only committed here,
  // once, and only on this success path — there is no branch that could
  // call commit()/rollback() a second time for the same context.
  try {
    await adapter.commit(context);
  } catch (commitError) {
    throw new TransactionCommitError(commitError);
  }
  return result;
}
