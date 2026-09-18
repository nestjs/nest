import { Injectable } from '@nestjs/common';
import { TransactionContext } from './interfaces/transaction-context.interface.js';
import { TransactionStorage } from './transaction.storage.js';

/**
 * Read-only access to the transaction active in the current async execution
 * chain, if any.
 *
 * Inject it wherever NestJS dependency injection is available:
 *
 * ```typescript
 * @Injectable()
 * export class OrderService {
 *   constructor(private readonly transactionHost: TransactionHost) {}
 *
 *   log() {
 *     if (this.transactionHost.isActive()) { ... }
 *   }
 * }
 * ```
 *
 * The same information is available without DI — for example inside a CLI
 * command, a queue processor, or a plain function — via the static
 * {@link TransactionHost.isActive} / {@link TransactionHost.getContext}.
 * Both read the same underlying `AsyncLocalStorage`, so there is exactly one
 * source of truth regardless of how it's accessed.
 *
 * @publicApi
 */
@Injectable()
export class TransactionHost {
  /**
   * Whether a transaction is currently active for this async execution
   * chain.
   */
  isActive(): boolean {
    return TransactionHost.isActive();
  }

  /**
   * The active {@link TransactionContext}, or `undefined` if none is active.
   *
   * This never exposes a database connection/session — see
   * {@link TransactionContext} for why.
   */
  getContext(): TransactionContext | undefined {
    return TransactionHost.getContext();
  }

  static isActive(): boolean {
    return TransactionStorage.getStore() !== undefined;
  }

  static getContext(): TransactionContext | undefined {
    return TransactionStorage.getStore();
  }
}
