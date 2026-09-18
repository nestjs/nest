import { Injectable } from '@nestjs/common';
import {
  MissingTransactionAdapterError,
  MissingTransactionContextError,
  TransactionCommitError,
  TransactionRollbackError,
  UnexpectedTransactionContextError,
} from '../errors/transaction.errors.js';
import { Transactional } from '../transactional.decorator.js';
import { TransactionAdapterRef } from '../transaction-adapter.ref.js';
import { TransactionHost } from '../transaction-host.service.js';
import { SpyTransactionAdapter } from './utils/spy-transaction-adapter.js';

describe('@Transactional()', () => {
  let adapter: SpyTransactionAdapter;

  beforeEach(() => {
    adapter = new SpyTransactionAdapter();
    TransactionAdapterRef.set(adapter);
  });

  afterEach(() => {
    TransactionAdapterRef.clear(adapter);
  });

  describe('basic behavior', () => {
    class Service {
      @Transactional()
      async success(value: number) {
        return value * 2;
      }

      @Transactional()
      async failure() {
        throw new Error('boom');
      }
    }

    it('begins and commits a transaction, returning the method result', async () => {
      const result = await new Service().success(21);

      expect(result).toBe(42);
      expect(adapter.calls.map(c => c.type)).toEqual(['begin', 'commit']);
    });

    it('rolls back and re-throws the original error on failure', async () => {
      const service = new Service();

      await expect(service.failure()).rejects.toThrow('boom');
      expect(adapter.calls.map(c => c.type)).toEqual(['begin', 'rollback']);
    });

    it('never calls commit after a rollback, or vice versa', async () => {
      await expect(new Service().failure()).rejects.toThrow();
      const commits = adapter.calls.filter(c => c.type === 'commit');
      const rollbacks = adapter.calls.filter(c => c.type === 'rollback');
      expect(commits).toHaveLength(0);
      expect(rollbacks).toHaveLength(1);
    });

    it('preserves `this` binding, arguments and async return semantics', async () => {
      class Counter {
        constructor(public value: number) {}

        @Transactional()
        async add(n: number) {
          this.value += n;
          return this.value;
        }
      }

      const counter = new Counter(10);
      const result = await counter.add(5);

      expect(result).toBe(15);
      expect(counter.value).toBe(15);
    });

    it('throws a TypeError when applied to something other than a method', () => {
      expect(() => {
        Transactional()({}, 'x', { value: undefined } as PropertyDescriptor);
      }).toThrow(TypeError);
    });
  });

  describe('context propagation', () => {
    it('is active inside the method', async () => {
      let activeDuringCall: boolean | undefined;

      class Service {
        @Transactional()
        async run() {
          activeDuringCall = TransactionHost.isActive();
        }
      }

      await new Service().run();
      expect(activeDuringCall).toBe(true);
    });

    it('remains active across `await` boundaries', async () => {
      const observed: boolean[] = [];

      class Service {
        @Transactional()
        async run() {
          observed.push(TransactionHost.isActive());
          await Promise.resolve();
          observed.push(TransactionHost.isActive());
          await new Promise(resolve => setTimeout(resolve, 0));
          observed.push(TransactionHost.isActive());
        }
      }

      await new Service().run();
      expect(observed).toEqual([true, true, true]);
    });

    it('is visible to a nested service called without passing anything explicitly', async () => {
      let sawContextInNestedService = false;

      @Injectable()
      class Inventory {
        reserve() {
          sawContextInNestedService = TransactionHost.isActive();
        }
      }

      class OrderService {
        constructor(private readonly inventory: Inventory) {}

        @Transactional()
        async createOrder() {
          this.inventory.reserve();
        }
      }

      await new OrderService(new Inventory()).createOrder();
      expect(sawContextInNestedService).toBe(true);
    });

    it('is cleared after the method resolves', async () => {
      class Service {
        @Transactional()
        async run() {
          /* no-op */
        }
      }

      await new Service().run();
      expect(TransactionHost.isActive()).toBe(false);
    });

    it('is cleared after the method rejects', async () => {
      class Service {
        @Transactional()
        async run() {
          throw new Error('fail');
        }
      }

      await expect(new Service().run()).rejects.toThrow('fail');
      expect(TransactionHost.isActive()).toBe(false);
    });

    it('does not leak between two concurrent calls on the same singleton instance', async () => {
      const seenIds: string[] = [];

      class Service {
        @Transactional()
        async run(delayMs: number) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
          seenIds.push(TransactionHost.getContext()!.id);
        }
      }

      const service = new Service();
      await Promise.all([service.run(10), service.run(0)]);

      expect(seenIds).toHaveLength(2);
      expect(seenIds[0]).not.toBe(seenIds[1]);
      expect(adapter.calls.filter(c => c.type === 'begin')).toHaveLength(2);
    });
  });

  describe('nesting (default propagation: REQUIRED)', () => {
    it('joins the existing transaction instead of starting a new one', async () => {
      class Service {
        @Transactional()
        async outer() {
          return this.inner();
        }

        @Transactional()
        async inner() {
          return TransactionHost.getContext()!.id;
        }
      }

      await new Service().outer();

      expect(adapter.calls.map(c => c.type)).toEqual(['begin', 'commit']);
    });

    it('only the outermost call commits, and there is exactly one transaction', async () => {
      const idsSeen = new Set<string>();

      class Service {
        @Transactional()
        async outer() {
          idsSeen.add(TransactionHost.getContext()!.id);
          await this.inner();
          await this.afterInner();
        }

        @Transactional()
        async inner() {
          idsSeen.add(TransactionHost.getContext()!.id);
        }

        @Transactional()
        async afterInner() {
          idsSeen.add(TransactionHost.getContext()!.id);
        }
      }

      await new Service().outer();

      expect(idsSeen.size).toBe(1);
      expect(adapter.calls.map(c => c.type)).toEqual(['begin', 'commit']);
    });

    it('rolls back the single shared transaction when the nested call fails', async () => {
      class Service {
        @Transactional()
        async outer() {
          await this.inner();
        }

        @Transactional()
        async inner() {
          throw new Error('nested failure');
        }
      }

      await expect(new Service().outer()).rejects.toThrow('nested failure');
      expect(adapter.calls.map(c => c.type)).toEqual(['begin', 'rollback']);
    });
  });

  describe('propagation: MANDATORY / NEVER', () => {
    class Service {
      @Transactional({ propagation: 'MANDATORY' })
      async mustJoin() {
        return 'ok';
      }

      @Transactional({ propagation: 'NEVER' })
      async mustNotJoin() {
        return 'ok';
      }

      @Transactional()
      async runMandatoryInside() {
        return this.mustJoin();
      }

      @Transactional()
      async runNeverInside() {
        return this.mustNotJoin();
      }
    }

    it('MANDATORY throws when there is no active transaction', async () => {
      await expect(new Service().mustJoin()).rejects.toThrow(
        MissingTransactionContextError,
      );
      expect(adapter.calls).toHaveLength(0);
    });

    it('MANDATORY succeeds when called from within a transaction', async () => {
      await expect(new Service().runMandatoryInside()).resolves.toBe('ok');
    });

    it('NEVER succeeds when there is no active transaction', async () => {
      await expect(new Service().mustNotJoin()).resolves.toBe('ok');
      expect(adapter.calls).toHaveLength(0);
    });

    it('NEVER throws when called from within a transaction', async () => {
      await expect(new Service().runNeverInside()).rejects.toThrow(
        UnexpectedTransactionContextError,
      );
    });
  });

  describe('errors', () => {
    it('propagates a synchronous throw the same as a rejection', async () => {
      class Service {
        @Transactional()
        async run() {
          throw new RangeError('sync-ish throw inside an async method');
        }
      }

      await expect(new Service().run()).rejects.toThrow(RangeError);
    });

    it('propagates custom application exceptions unchanged', async () => {
      class DomainError extends Error {}

      class Service {
        @Transactional()
        async run() {
          throw new DomainError('domain failure');
        }
      }

      await expect(new Service().run()).rejects.toBeInstanceOf(DomainError);
    });

    it('propagates errors thrown by a nested (non-decorated) service call', async () => {
      class Repository {
        insert() {
          throw new Error('constraint violation');
        }
      }

      class Service {
        constructor(private readonly repo: Repository) {}

        @Transactional()
        async run() {
          this.repo.insert();
        }
      }

      await expect(new Service(new Repository()).run()).rejects.toThrow(
        'constraint violation',
      );
      expect(adapter.calls.map(c => c.type)).toEqual(['begin', 'rollback']);
    });

    it('wraps a commit failure in TransactionCommitError', async () => {
      adapter.failCommitWith = new Error('disk full');

      class Service {
        @Transactional()
        async run() {
          return 'value';
        }
      }

      const error = await new Service()
        .run()
        .catch(e => e as TransactionCommitError);

      expect(error).toBeInstanceOf(TransactionCommitError);
      expect((error.cause as Error).message).toBe('disk full');
    });

    it('wraps a rollback failure in TransactionRollbackError without losing the original error', async () => {
      adapter.failRollbackWith = new Error('connection lost');

      class Service {
        @Transactional()
        async run() {
          throw new Error('original failure');
        }
      }

      const error = await new Service()
        .run()
        .catch(e => e as TransactionRollbackError);

      expect(error).toBeInstanceOf(TransactionRollbackError);
      expect((error.originalError as Error).message).toBe('original failure');
      expect((error.cause as Error).message).toBe('connection lost');
    });

    it('throws MissingTransactionAdapterError when no adapter is registered', async () => {
      TransactionAdapterRef.clear(adapter);

      class Service {
        @Transactional()
        async run() {
          return 'value';
        }
      }

      await expect(new Service().run()).rejects.toThrow(
        MissingTransactionAdapterError,
      );

      // Re-register so `afterEach`'s `clear()` call is a no-op-safe match.
      TransactionAdapterRef.set(adapter);
    });
  });

  describe('async patterns', () => {
    it('keeps the same transaction across Promise.all()', async () => {
      class Service {
        @Transactional()
        async run() {
          const [a, b] = await Promise.all([this.a(), this.b()]);
          return [a, b];
        }

        private async a() {
          return TransactionHost.getContext()!.id;
        }

        private async b() {
          await Promise.resolve();
          return TransactionHost.getContext()!.id;
        }
      }

      const [a, b] = await new Service().run();
      expect(a).toBe(b);
      expect(adapter.calls.map(c => c.type)).toEqual(['begin', 'commit']);
    });
  });

  describe('compatibility', () => {
    it('leaves non-decorated methods on the same class completely unaffected', async () => {
      class Service {
        plain() {
          return TransactionHost.isActive();
        }

        @Transactional()
        async transactional() {
          return this.plain();
        }
      }

      const service = new Service();
      expect(service.plain()).toBe(false);
      expect(await service.transactional()).toBe(true);
      expect(service.plain()).toBe(false);
    });

    it('does not touch AsyncLocalStorage at all for non-transactional calls', async () => {
      class Service {
        plain() {
          return 'ok';
        }
      }

      expect(new Service().plain()).toBe('ok');
      expect(adapter.calls).toHaveLength(0);
    });
  });
});
