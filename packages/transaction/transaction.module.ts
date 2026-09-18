import { DynamicModule, Module, Provider } from '@nestjs/common';
import {
  TransactionModuleAsyncOptions,
  TransactionModuleOptions,
} from './interfaces/transaction-module-options.interface.js';
import { TransactionAdapterRegistrar } from './transaction-adapter.registrar.js';
import { TRANSACTION_ADAPTER } from './transaction.constants.js';
import { TransactionHost } from './transaction-host.service.js';

/**
 * Registers the {@link TransactionAdapter} that `@Transactional()` and
 * `TransactionHost` use.
 *
 * ```typescript
 * @Module({
 *   imports: [
 *     TransactionModule.forRoot({ adapter: TypeOrmTransactionAdapter }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * Or, when the adapter needs configuration resolved asynchronously (e.g.
 * from another module):
 *
 * ```typescript
 * TransactionModule.forRootAsync({
 *   imports: [TypeOrmModule],
 *   useFactory: (dataSource: DataSource) => new TypeOrmTransactionAdapter(dataSource),
 *   inject: [DataSource],
 * });
 * ```
 *
 * Only one adapter is supported per application in this version. Importing
 * `TransactionModule.forRoot()`/`forRootAsync()` more than once replaces the
 * previously registered adapter for any `@Transactional()` call that runs
 * afterwards — it does not merge or namespace them. Supporting multiple
 * named adapters (e.g. `@Transactional({ adapter: 'reporting' })` for a
 * secondary database) is a natural follow-up, not implemented here to keep
 * the initial surface small.
 *
 * ### `Promise.all()` vs. transaction boundaries
 *
 * `@Transactional()` controls when a database transaction begins/commits/
 * rolls back. `Promise.all()` only controls how JavaScript waits for
 * multiple promises — it does not make concurrent operations transactionally
 * safe. Inside a `@Transactional()` method:
 *
 * ```typescript
 * @Transactional()
 * async createOrder() {
 *   await Promise.all([this.orders.create(), this.inventory.reserve()]);
 * }
 * ```
 *
 * both calls run within the same transaction *context*, but whether they can
 * safely run concurrently against it is entirely up to the adapter/driver —
 * most SQL drivers do not allow concurrent queries on one connection. Check
 * your adapter's documentation before relying on concurrent writes inside a
 * transaction.
 *
 * ### Limitations
 *
 * - Transaction support is only as good as the registered adapter — not
 *   every database/ORM combination supports the same semantics (isolation
 *   levels, savepoints, concurrent queries on one connection, etc).
 * - Nested `@Transactional()` calls join the existing transaction
 *   (`propagation: 'REQUIRED'`, the default); there are no savepoints in
 *   this version, so a nested call cannot roll back independently of the
 *   outer one.
 * - Keep transactions short — a long-running transaction holds a database
 *   connection/lock for its entire duration.
 * - A database transaction cannot undo external side effects. Sending an
 *   email or calling another service from inside a `@Transactional()` method
 *   is not rolled back if the transaction later fails:
 *
 *   ```typescript
 *   @Transactional()
 *   async createOrder() {
 *     await this.orders.create();
 *     await this.emailService.send(); // NOT rolled back on failure
 *     await this.inventory.reserve();
 *   }
 *   ```
 *
 *   For reliable external side effects, consider the outbox pattern (write
 *   the intent to an outbox table in the same transaction, then have a
 *   separate process deliver it) — not implemented by this module.
 *
 * @publicApi
 */
@Module({})
export class TransactionModule {
  static forRoot(options: TransactionModuleOptions): DynamicModule {
    const adapterProvider: Provider = {
      provide: TRANSACTION_ADAPTER,
      useClass: options.adapter,
    };

    return {
      module: TransactionModule,
      global: options.isGlobal,
      providers: [
        adapterProvider,
        TransactionAdapterRegistrar,
        TransactionHost,
      ],
      exports: [TRANSACTION_ADAPTER, TransactionHost],
    };
  }

  static forRootAsync(options: TransactionModuleAsyncOptions): DynamicModule {
    return {
      module: TransactionModule,
      global: options.isGlobal,
      imports: options.imports ?? [],
      providers: [
        ...createAsyncAdapterProviders(options),
        TransactionAdapterRegistrar,
        TransactionHost,
      ],
      exports: [TRANSACTION_ADAPTER, TransactionHost],
    };
  }
}

function createAsyncAdapterProviders(
  options: TransactionModuleAsyncOptions,
): Provider[] {
  if (options.useFactory) {
    return [
      {
        provide: TRANSACTION_ADAPTER,
        useFactory: options.useFactory,
        inject: options.inject ?? [],
      },
    ];
  }

  if (options.useExisting) {
    return [
      {
        provide: TRANSACTION_ADAPTER,
        useExisting: options.useExisting,
      },
    ];
  }

  if (options.useClass) {
    return [
      {
        provide: TRANSACTION_ADAPTER,
        useClass: options.useClass,
      },
    ];
  }

  throw new TypeError(
    'TransactionModule.forRootAsync() requires one of "useFactory", "useClass" or "useExisting".',
  );
}
