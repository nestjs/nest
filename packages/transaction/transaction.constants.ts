/**
 * DI token for the {@link TransactionAdapter} configured via
 * `TransactionModule.forRoot()`/`forRootAsync()`. Exported so an application
 * can also inject the adapter directly if it ever needs to, though most code
 * should only need `@Transactional()` and `TransactionHost`.
 *
 * @publicApi
 */
export const TRANSACTION_ADAPTER = Symbol('TRANSACTION_ADAPTER');
