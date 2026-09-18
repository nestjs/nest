import { AsyncLocalStorage } from 'node:async_hooks';
import { TransactionAdapter } from '../../interfaces/transaction-adapter.interface.js';
import { TransactionContext } from '../../interfaces/transaction-context.interface.js';

/**
 * A tiny, genuinely stateful "database": committed rows actually live here,
 * and a rolled-back transaction's writes are actually discarded rather than
 * merely un-recorded by a mock. Used to prove `@Transactional()` provides
 * real atomicity, not just correctly-ordered calls to a spy.
 *
 * This is a test fixture, not a product of this feature — see
 * `integration/transaction` for the same contract exercised against a real
 * TypeORM `DataSource`.
 */
export class InMemoryDatabase {
  private committedRows: string[] = [];
  private readonly stagedRowsByTxId = new Map<string, string[]>();

  insert(row: string, txId: string | undefined): void {
    if (!txId) {
      this.committedRows.push(row);
      return;
    }
    const staged = this.stagedRowsByTxId.get(txId) ?? [];
    staged.push(row);
    this.stagedRowsByTxId.set(txId, staged);
  }

  commit(txId: string): void {
    const staged = this.stagedRowsByTxId.get(txId) ?? [];
    this.committedRows.push(...staged);
    this.stagedRowsByTxId.delete(txId);
  }

  rollback(txId: string): void {
    this.stagedRowsByTxId.delete(txId);
  }

  getCommittedRows(): readonly string[] {
    return this.committedRows;
  }
}

/**
 * A minimal, real `TransactionAdapter` over {@link InMemoryDatabase}. Mirrors
 * how a real ORM adapter binds its own session (here: just a transaction id)
 * to running code via its own `AsyncLocalStorage`, independent of the
 * framework core's — see `TransactionAdapter`'s docs for why that separation
 * exists.
 */
export class InMemoryTransactionAdapter implements TransactionAdapter {
  private nextId = 0;
  private readonly session = new AsyncLocalStorage<string>();

  constructor(private readonly db: InMemoryDatabase) {}

  async begin(): Promise<TransactionContext> {
    return { id: `tx-${++this.nextId}` };
  }

  runInTransaction<T>(
    context: TransactionContext,
    fn: () => Promise<T> | T,
  ): Promise<T> {
    return this.session.run(context.id, async () => fn());
  }

  async commit(context: TransactionContext): Promise<void> {
    this.db.commit(context.id);
  }

  async rollback(context: TransactionContext): Promise<void> {
    this.db.rollback(context.id);
  }

  /**
   * What a repository would call to find "the transaction id to write
   * under, if any" — this is the piece that lets application code call
   * `repository.insert(row)` with no transaction argument.
   */
  currentTransactionId(): string | undefined {
    return this.session.getStore();
  }
}

/**
 * Stands in for a real repository: it never receives a transaction object
 * from its caller, matching the target developer experience.
 */
export class InMemoryRowsRepository {
  constructor(
    private readonly db: InMemoryDatabase,
    private readonly adapter: InMemoryTransactionAdapter,
  ) {}

  insert(row: string): void {
    this.db.insert(row, this.adapter.currentTransactionId());
  }
}
