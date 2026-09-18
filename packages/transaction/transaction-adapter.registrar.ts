import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { TransactionAdapter } from './interfaces/transaction-adapter.interface.js';
import { TRANSACTION_ADAPTER } from './transaction.constants.js';
import { TransactionAdapterRef } from './transaction-adapter.ref.js';

/**
 * Bridges the DI-managed adapter provider to {@link TransactionAdapterRef},
 * the static registry `@Transactional()` reads from. Registering on
 * `onModuleInit` (rather than the provider's constructor) ensures the
 * adapter has finished its own initialization — e.g. a TypeORM adapter
 * awaiting `DataSource.initialize()` in its constructor is not guaranteed to
 * be ready yet, but `onModuleInit` runs after the module graph is built.
 *
 * Registered as part of `TransactionModule`'s definition — not part of the
 * public API.
 */
@Injectable()
export class TransactionAdapterRegistrar
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    @Inject(TRANSACTION_ADAPTER)
    private readonly adapter: TransactionAdapter,
  ) {}

  onModuleInit() {
    TransactionAdapterRef.set(this.adapter);
  }

  onModuleDestroy() {
    TransactionAdapterRef.clear(this.adapter);
  }
}
