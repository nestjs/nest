import { TransactionAdapter } from '../../interfaces/transaction-adapter.interface.js';
import { TransactionContext } from '../../interfaces/transaction-context.interface.js';

let nextId = 0;

/**
 * A controllable `TransactionAdapter` for exercising the framework's
 * lifecycle/propagation logic in isolation, independent of any real
 * database. Records every call so tests can assert exactly how many times
 * (and in what order) begin/commit/rollback fired.
 */
export class SpyTransactionAdapter implements TransactionAdapter {
  readonly calls: Array<
    | { type: 'begin'; id: string }
    | { type: 'commit'; id: string }
    | { type: 'rollback'; id: string }
  > = [];

  failCommitWith: unknown;
  failRollbackWith: unknown;

  async begin(): Promise<TransactionContext> {
    const context = { id: `tx-${++nextId}` };
    this.calls.push({ type: 'begin', id: context.id });
    return context;
  }

  async runInTransaction<T>(
    _context: TransactionContext,
    fn: () => Promise<T> | T,
  ): Promise<T> {
    return fn();
  }

  async commit(context: TransactionContext): Promise<void> {
    this.calls.push({ type: 'commit', id: context.id });
    if (this.failCommitWith) {
      throw this.failCommitWith;
    }
  }

  async rollback(context: TransactionContext): Promise<void> {
    this.calls.push({ type: 'rollback', id: context.id });
    if (this.failRollbackWith) {
      throw this.failRollbackWith;
    }
  }
}
