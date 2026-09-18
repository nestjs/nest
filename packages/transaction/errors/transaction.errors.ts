/**
 * Base class for every error thrown by `@nestjs/transaction`.
 *
 * @publicApi
 */
export abstract class TransactionError extends Error {
  /**
   * Set manually (rather than via the ES2022 `Error(message, { cause })`
   * constructor overload) so this package doesn't require consumers to
   * target `ES2022`+ lib types.
   */
  readonly cause?: unknown;

  protected constructor(message: string, cause?: unknown) {
    super(message);
    this.name = new.target.name;
    this.cause = cause;
  }
}

/**
 * Thrown by `@Transactional()` when no {@link TransactionAdapter} has been
 * registered via `TransactionModule.forRoot()`/`forRootAsync()`.
 *
 * @publicApi
 */
export class MissingTransactionAdapterError extends TransactionError {
  constructor() {
    super(
      'No transaction adapter is registered. Import `TransactionModule.forRoot({ adapter: ... })` ' +
        '(or `forRootAsync(...)`) before using `@Transactional()`.',
    );
  }
}

/**
 * Thrown when a method decorated with `@Transactional({ propagation: 'MANDATORY' })`
 * is invoked without an active transaction.
 *
 * @publicApi
 */
export class MissingTransactionContextError extends TransactionError {
  constructor() {
    super(
      'This method requires an active transaction (propagation: "MANDATORY"), ' +
        'but none is active. Call it from within another `@Transactional()` method.',
    );
  }
}

/**
 * Thrown when a method decorated with `@Transactional({ propagation: 'NEVER' })`
 * is invoked while a transaction is already active.
 *
 * @publicApi
 */
export class UnexpectedTransactionContextError extends TransactionError {
  constructor() {
    super(
      'This method must not run inside a transaction (propagation: "NEVER"), ' +
        'but one is currently active.',
    );
  }
}

/**
 * Thrown when {@link TransactionAdapter.commit} fails. The underlying error
 * is available as `.cause`.
 *
 * @publicApi
 */
export class TransactionCommitError extends TransactionError {
  constructor(cause: unknown) {
    super('Failed to commit the transaction.', cause);
  }
}

/**
 * Thrown when the *original* method error and a subsequent
 * {@link TransactionAdapter.rollback} failure both need to be surfaced.
 * Neither is discarded: `originalError` is the error that triggered the
 * rollback, `cause` is the error thrown by `rollback()` itself.
 *
 * @publicApi
 */
export class TransactionRollbackError extends TransactionError {
  constructor(
    public readonly originalError: unknown,
    rollbackError: unknown,
  ) {
    super(
      'The transactional method failed, and rolling back the transaction ' +
        'also failed. See "originalError" for the method failure and ' +
        '"cause" for the rollback failure.',
      rollbackError,
    );
  }
}
