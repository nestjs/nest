import { TransactionPropagation } from './transaction-propagation.type.js';

/**
 * Options accepted by `@Transactional()`.
 *
 * @publicApi
 */
export interface TransactionalOptions {
  /**
   * @default 'REQUIRED'
   */
  propagation?: TransactionPropagation;
}
