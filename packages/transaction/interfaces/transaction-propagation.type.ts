/**
 * Transaction propagation modes implemented by `@nestjs/transaction`.
 *
 * - `REQUIRED` (default): join the active transaction, or start a new one if
 *   none is active.
 * - `MANDATORY`: require an active transaction; throw
 *   {@link MissingTransactionContextError} if none exists. Useful for
 *   methods that must never run outside a transaction started by a caller.
 * - `NEVER`: require that no transaction is active; throw
 *   {@link UnexpectedTransactionContextError} otherwise. Useful for methods
 *   that must not be pulled into a caller's transaction (e.g. because they
 *   perform a non-transactional side effect and should fail loudly if
 *   someone tries to wrap them).
 *
 * `REQUIRES_NEW` and `NOT_SUPPORTED` are intentionally not implemented yet:
 * both require *suspending* the active transaction (running an independent
 * transaction, possibly on a separate connection, while the outer one is
 * paused) which {@link TransactionAdapter} does not model in this version.
 * Exposing them without correct suspension support would silently produce
 * wrong behavior (e.g. reusing one connection for two "independent"
 * transactions), so they are left out of this union rather than shipped as
 * options that don't actually work.
 *
 * Nothing here forecloses adding them later: {@link TransactionContext}
 * already carries an optional `parent`, and propagation is dispatched from a
 * single place ({@link runTransactional}), so a future mode only needs a new
 * case there plus a richer `TransactionAdapter` (e.g. `suspend`/`resume`).
 *
 * @publicApi
 */
export type TransactionPropagation = 'REQUIRED' | 'MANDATORY' | 'NEVER';
