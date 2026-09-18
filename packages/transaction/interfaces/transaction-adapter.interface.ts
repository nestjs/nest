import { TransactionContext } from './transaction-context.interface.js';

/**
 * Translates the framework's transaction lifecycle into a concrete
 * database/ORM transaction.
 *
 * `@nestjs/transaction` owns *when* a transaction begins, commits, or rolls
 * back, and how that fact propagates across `await` boundaries. An adapter
 * owns *how* that translates into an actual database transaction — the
 * connection/session it uses, and how it makes that session reachable from
 * repositories/queries executed while the transaction is open.
 *
 * Implementations live outside `@nestjs/transaction` (e.g. in a separate
 * `@nestjs/transaction-typeorm` style package) so the core stays free of any
 * ORM or database driver dependency.
 *
 * @publicApi
 */
export interface TransactionAdapter<TBeginOptions = unknown> {
  /**
   * Opens a new transaction (e.g. `BEGIN`) and returns a context identifying
   * it. Called once per outermost `@Transactional()` call — nested calls
   * that join an existing transaction (the `REQUIRED` default) never call
   * this again.
   */
  begin(options?: TBeginOptions): Promise<TransactionContext>;

  /**
   * Runs `fn`, making the transaction identified by `context` available to
   * whatever database calls happen inside it — for example by binding the
   * adapter's connection/session to its own `AsyncLocalStorage`, or any
   * other mechanism appropriate for the underlying driver.
   *
   * This is a separate step from {@link begin} because propagation
   * decisions (join vs. start new) are made by the framework core, while
   * *how* a session is threaded through application code is entirely
   * adapter-specific.
   */
  runInTransaction<T>(
    context: TransactionContext,
    fn: () => Promise<T> | T,
  ): Promise<T>;

  /**
   * Commits the transaction identified by `context` (e.g. `COMMIT`).
   * Called exactly once, only after `fn` resolves successfully.
   */
  commit(context: TransactionContext): Promise<void>;

  /**
   * Rolls back the transaction identified by `context` (e.g. `ROLLBACK`).
   * Called exactly once, only when `fn` throws/rejects.
   */
  rollback(context: TransactionContext): Promise<void>;
}
