/**
 * Represents an open transaction.
 *
 * This is intentionally minimal: the core framework only needs enough shape
 * to track transaction identity and nesting so it can implement propagation
 * (`REQUIRED`, `MANDATORY`, `NEVER`) and expose {@link TransactionHost}.
 *
 * It deliberately does **not** expose a database connection, client, session,
 * or query builder — those are adapter-specific and would couple the core to
 * a particular ORM/driver. An adapter that needs to bind its own session to
 * the running code does so inside {@link TransactionAdapter.runInTransaction},
 * using whatever mechanism fits its driver (its own `AsyncLocalStorage`, a
 * request-scoped provider, a patched repository, etc.), keyed by `id`.
 *
 * @publicApi
 */
export interface TransactionContext {
  /**
   * Uniquely identifies this transaction. Adapters may use this to look up
   * their own session/connection object for the transaction.
   */
  readonly id: string;

  /**
   * The transaction this one was opened inside of, if any. Not used by the
   * `REQUIRED`/`MANDATORY`/`NEVER` propagation modes implemented today, but
   * kept so that propagation modes requiring a transaction hierarchy (e.g. a
   * future `REQUIRES_NEW`/savepoint-based nesting) can be added without a
   * breaking change to this interface.
   */
  readonly parent?: TransactionContext;
}
