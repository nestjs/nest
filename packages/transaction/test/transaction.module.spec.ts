import { Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TransactionAdapter } from '../interfaces/transaction-adapter.interface.js';
import { TransactionContext } from '../interfaces/transaction-context.interface.js';
import { TransactionAdapterRef } from '../transaction-adapter.ref.js';
import { TRANSACTION_ADAPTER } from '../transaction.constants.js';
import { TransactionModule } from '../transaction.module.js';
import { TransactionHost } from '../transaction-host.service.js';

@Injectable()
class NoopAdapter implements TransactionAdapter {
  async begin(): Promise<TransactionContext> {
    return { id: 'noop' };
  }
  async runInTransaction<T>(
    _ctx: TransactionContext,
    fn: () => Promise<T> | T,
  ) {
    return fn();
  }
  async commit(): Promise<void> {}
  async rollback(): Promise<void> {}
}

describe('TransactionModule', () => {
  describe('forRoot', () => {
    it('provides the adapter under TRANSACTION_ADAPTER and TransactionHost', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [TransactionModule.forRoot({ adapter: NoopAdapter })],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      expect(app.get(TRANSACTION_ADAPTER)).toBeInstanceOf(NoopAdapter);
      expect(app.get(TransactionHost)).toBeInstanceOf(TransactionHost);
      expect(TransactionAdapterRef.get()).toBeInstanceOf(NoopAdapter);

      await app.close();
    });

    it('clears the registry on shutdown so it does not leak into later modules', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [TransactionModule.forRoot({ adapter: NoopAdapter })],
      }).compile();
      const app = moduleRef.createNestApplication();
      await app.init();

      expect(TransactionAdapterRef.get()).toBeDefined();

      await app.close();

      expect(TransactionAdapterRef.get()).toBeUndefined();
    });
  });

  describe('forRootAsync', () => {
    it('resolves the adapter via useFactory with injected dependencies', async () => {
      const CONFIG = Symbol('CONFIG');

      @Module({
        providers: [{ provide: CONFIG, useValue: { flavor: 'async' } }],
        exports: [CONFIG],
      })
      class ConfigModule {}

      const moduleRef = await Test.createTestingModule({
        imports: [
          TransactionModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (config: { flavor: string }) => {
              expect(config.flavor).toBe('async');
              return new NoopAdapter();
            },
            inject: [CONFIG],
          }),
        ],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      expect(app.get(TRANSACTION_ADAPTER)).toBeInstanceOf(NoopAdapter);

      await app.close();
    });

    it('throws when none of useFactory/useClass/useExisting is provided', () => {
      expect(() => TransactionModule.forRootAsync({})).toThrow(TypeError);
    });
  });
});
