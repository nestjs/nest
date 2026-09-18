import { ModuleMetadata, Type } from '@nestjs/common';
import { TransactionAdapter } from './transaction-adapter.interface.js';

/**
 * Options for `TransactionModule.forRoot()`.
 *
 * @publicApi
 */
export interface TransactionModuleOptions {
  /**
   * The adapter class to register. It is instantiated through Nest's
   * dependency injection, so it may declare its own constructor
   * dependencies (e.g. a `DataSource` provided by another imported module).
   */
  adapter: Type<TransactionAdapter>;

  /**
   * Registers `TransactionModule` as a global module, so `TransactionHost`
   * and the `TRANSACTION_ADAPTER` token don't need to be re-imported in
   * every feature module.
   *
   * @default false
   */
  isGlobal?: boolean;
}

/**
 * Options for `TransactionModule.forRootAsync()`.
 *
 * Follows the same `useFactory`/`useClass`/`useExisting` shape used
 * throughout Nest for async provider registration.
 *
 * @publicApi
 */
export interface TransactionModuleAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  isGlobal?: boolean;
  useFactory?: (
    ...args: any[]
  ) => Promise<TransactionAdapter> | TransactionAdapter;
  useClass?: Type<TransactionAdapter>;
  useExisting?: Type<TransactionAdapter>;
  inject?: any[];
}
