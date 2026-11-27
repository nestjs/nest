import {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { AsyncLocalStorage, createHook } from 'async_hooks';
import {
  Observable,
  defer,
  finalize,
  lastValueFrom,
  map,
  merge,
  observable,
  of,
  retry,
} from 'rxjs';
import { PassThrough } from 'stream';
import { registerClassRef } from '../../helpers/class-ref-registry.js';
import { InterceptorsConsumer } from '../../interceptors/interceptors-consumer.js';

describe('InterceptorsConsumer', () => {
  let consumer: InterceptorsConsumer;
  let interceptors: any[];
  beforeEach(() => {
    consumer = new InterceptorsConsumer();
    interceptors = [
      {
        intercept: vi
          .fn()
          .mockImplementation((ctx, handler) => handler.handle()),
      },
      {
        intercept: vi
          .fn()
          .mockImplementation(async (ctx, handler) => handler.handle()),
      },
    ];
  });
  describe('intercept', () => {
    describe('when interceptors array is empty', () => {
      let next: ReturnType<typeof vi.fn>;
      beforeEach(() => {
        next = vi.fn();
      });
      it('should call next()', async () => {
        await consumer.intercept([], null!, { constructor: null }, null!, next);
        expect(next).toHaveBeenCalledOnce();
      });
    });
    describe('when interceptors array is not empty', () => {
      let next: ReturnType<typeof vi.fn>;
      beforeEach(() => {
        next = vi.fn().mockReturnValue(Promise.resolve(''));
      });
      it('does not call `intercept` (lazy evaluation)', async () => {
        await consumer.intercept(
          interceptors,
          null!,
          { constructor: null },
          null!,
          next,
        );

        expect(interceptors[0].intercept).not.toHaveBeenCalled();
        expect(interceptors[1].intercept).not.toHaveBeenCalled();
      });
      it('should call every `intercept` method when subscribe', async () => {
        const intercepted = await consumer.intercept(
          interceptors,
          null!,
          { constructor: null },
          null!,
          next,
        );
        await transformToResult(intercepted);

        expect(interceptors[0].intercept).toHaveBeenCalledOnce();
        expect(interceptors[1].intercept).toHaveBeenCalledOnce();
      });
      it('should not call `next` (lazy evaluation)', async () => {
        await consumer.intercept(
          interceptors,
          null!,
          { constructor: null },
          null!,
          next,
        );
        expect(next).not.toHaveBeenCalled();
      });
      it('should call `next` when subscribe', async () => {
        const intercepted = await consumer.intercept(
          interceptors,
          null!,
          { constructor: null },
          null!,
          next,
        );
        await transformToResult(intercepted);
        expect(next).toHaveBeenCalled();
      });
    });

    describe('when AsyncLocalStorage is used', () => {
      it('should allow an interceptor to set values in AsyncLocalStorage that are accessible from the controller', async () => {
        const storage = new AsyncLocalStorage<Record<string, any>>();
        class StorageInterceptor implements NestInterceptor {
          intercept(
            _context: ExecutionContext,
            next: CallHandler<any>,
          ): Observable<any> | Promise<Observable<any>> {
            return storage.run({ value: 'hello' }, () => next.handle());
          }
        }
        const next = () => {
          return Promise.resolve(storage.getStore()!.value);
        };
        const intercepted = await consumer.intercept(
          [new StorageInterceptor()],
          null!,
          { constructor: null },
          null!,
          next,
        );
        const result = await transformToResult(intercepted);
        expect(result).toBe('hello');
      });

      it('should run each step in an async resource created when it is reached', async () => {
        const types: string[] = [];
        const hook = createHook({
          init: (_id, type) => type !== 'PROMISE' && types.push(type),
        }).enable();
        try {
          const intercepted = await consumer.intercept(
            [{ intercept: (_context, next) => next.handle() }],
            null!,
            { constructor: null },
            null!,
            () => Promise.resolve('value'),
          );
          expect(await transformToResult(intercepted)).toBe('value');
        } finally {
          hook.disable();
        }
        // one scope per `handle()` call, the handler runs in the last one
        expect(types).toEqual(['interceptor-scope']);
      });
    });

    describe('when retrying is enabled', () => {
      it('should retry a specified amount of times', async () => {
        let count = 0;
        const next = () => {
          count++;
          if (count < 3) {
            return Promise.reject(new Error('count not reached'));
          }
          return Promise.resolve(count);
        };
        class RetryInterceptor implements NestInterceptor {
          intercept(
            _context: ExecutionContext,
            next: CallHandler<any>,
          ): Observable<any> | Promise<Observable<any>> {
            return next.handle().pipe(retry(4));
          }
        }
        const intercepted = await consumer.intercept(
          [new RetryInterceptor()],
          null!,
          { constructor: null },
          null!,
          next,
        );
        expect(await transformToResult(intercepted)).toBe(3);
      });
    });
  });
  describe('interceptor chain', () => {
    const run = (chain: NestInterceptor[], next: () => Promise<unknown>) =>
      consumer.intercept(chain, null!, { constructor: null }, null!, next);

    it('should run the handler in the store of the nearest `handle()` call, behind several interceptors', async () => {
      const storage = new AsyncLocalStorage<string>();
      const setStore = (value: string): NestInterceptor => ({
        intercept: (_context, next) =>
          storage.run(value, () => next.handle()) as Observable<any>,
      });
      const seen: Array<string | undefined> = [];
      const result = await transformToResult(
        await storage.run('outer', () =>
          run([setStore('a'), { intercept: (_c, h) => h.handle() }], () => {
            seen.push(storage.getStore());
            return Promise.resolve('done');
          }),
        ),
      );
      expect(result).toBe('done');
      expect(seen).toEqual(['a']);
    });

    it('should keep the store when an interceptor subscribes to the handler later', async () => {
      const storage = new AsyncLocalStorage<string>();
      const seen: Array<string | undefined> = [];
      const later: NestInterceptor = {
        intercept: (_context, next) => {
          const handled = next.handle();
          return new Observable(subscriber => {
            setTimeout(() => handled.subscribe(subscriber), 1);
          });
        },
      };
      await transformToResult(
        await run(
          [
            {
              intercept: (_c, h) =>
                storage.run('a', () => h.handle()) as Observable<any>,
            },
            later,
          ],
          () => {
            seen.push(storage.getStore());
            return Promise.resolve(1);
          },
        ),
      );
      expect(seen).toEqual(['a']);
    });

    it('should emit a plain handler value once and complete, through a mapping interceptor', async () => {
      const emitted: unknown[] = [];
      let completed = 0;
      const mapping: NestInterceptor = {
        intercept: (_context, next) =>
          next.handle().pipe(map(data => ({ data }))),
      };
      const observable$ = (await run(
        [mapping, { intercept: (_c, h) => h.handle() }],
        async () => 'x',
      )) as Observable<unknown>;
      await new Promise<void>(resolve =>
        observable$.subscribe({
          next: v => emitted.push(v),
          complete: () => {
            completed++;
            resolve();
          },
        }),
      );
      expect(emitted).toEqual([{ data: 'x' }]);
      expect(completed).toBe(1);
    });

    it('should tear the chain down on unsubscribe without subscribing the handler result', async () => {
      let resolveNext!: (value: unknown) => void;
      const handlerResult$ = new Observable(() => {
        throw new Error('the handler result must not be subscribed');
      });
      const teardowns: string[] = [];
      const watching: NestInterceptor = {
        intercept: (_context, next) =>
          next.handle().pipe(finalize(() => teardowns.push('interceptor'))),
      };
      const observable$ = (await run(
        [watching],
        () => new Promise(resolve => (resolveNext = resolve)),
      )) as Observable<unknown>;
      const subscription = observable$.subscribe();
      await new Promise(resolve => setTimeout(resolve, 1));
      subscription.unsubscribe();
      resolveNext(handlerResult$);
      await new Promise(resolve => setTimeout(resolve, 1));
      expect(teardowns).toEqual(['interceptor']);
    });

    it('should unsubscribe from the handler result when the consumer unsubscribes', async () => {
      let unsubscribed = false;
      const handlerResult$ = new Observable(() => () => {
        unsubscribed = true;
      });
      const observable$ = (await run(
        [{ intercept: (_c, h) => h.handle() }],
        async () => handlerResult$,
      )) as Observable<unknown>;
      const subscription = observable$.subscribe();
      await new Promise(resolve => setTimeout(resolve, 1));
      subscription.unsubscribe();
      expect(unsubscribed).toBe(true);
    });

    it('should accept an Observable of another copy of rxjs returned by an interceptor', async () => {
      const source$ = of('foreign');
      const foreign$ = {
        lift: source$.lift.bind(source$),
        subscribe: source$.subscribe.bind(source$),
        [observable]: () => source$,
      };
      const result = await transformToResult(
        await run([{ intercept: () => foreign$ as any }], async () => 1),
      );
      expect(result).toBe('foreign');
    });

    it('should accept a Promise of an Observable returned by an interceptor', async () => {
      const result = await transformToResult(
        await run(
          [{ intercept: async (_c, h) => h.handle() }],
          async () => 'p',
        ),
      );
      expect(result).toBe('p');
    });

    it('should turn an interceptor throwing synchronously into an error notification', async () => {
      const observable$ = (await run(
        [
          {
            intercept: () => {
              throw new Error('boom');
            },
          },
        ],
        async () => 1,
      )) as Observable<unknown>;
      await expect(lastValueFrom(observable$)).rejects.toThrow('boom');
    });

    it('should subscribe the Observable an interceptor returns without a microtask hop', async () => {
      const calls: string[] = [];
      const observable$ = (await run(
        [
          { intercept: (_c, h) => h.handle() },
          {
            intercept: (_c, h) => {
              calls.push('second');
              return h.handle();
            },
          },
        ],
        async () => 1,
      )) as Observable<unknown>;
      observable$.subscribe();
      expect(calls).toEqual(['second']);
    });
  });

  describe('createContext', () => {
    it('should return execution context object', () => {
      const instance = { constructor: {} };
      const callback = () => null;
      const context = consumer.createContext([], instance, callback);

      expect(context.getClass()).toEqual(instance.constructor);
      expect(context.getHandler()).toEqual(callback);
    });
    describe('when a mixin helper overwrote the "constructor" of the host prototype', () => {
      class Mixin {
        public mixedIn() {}
      }
      class Host {
        public own() {}
      }
      // What the TypeScript handbook's `applyMixins()` does
      Object.defineProperties(
        Host.prototype,
        Object.getOwnPropertyDescriptors(Mixin.prototype),
      );
      registerClassRef(Host);

      it('should return the registered class, not the overwritten "constructor"', () => {
        const context = consumer.createContext([], new Host(), () => null);

        expect(Host.prototype.constructor).toBe(Mixin);
        expect(context.getClass()).toBe(Host);
      });
    });
  });
  describe('transformDeferred', () => {
    describe('when next() result is plain value', () => {
      it('should return Observable', async () => {
        const val = 3;
        const next = async () => val;
        expect(await lastValueFrom(consumer.transformDeferred(next))).toEqual(
          val,
        );
      });
    });
    describe('when next() result is a plain value', () => {
      it('should emit it in the turn that resolves next()', async () => {
        const emitted: unknown[] = [];
        consumer
          .transformDeferred(() => Promise.resolve(1))
          .subscribe(value => emitted.push(value));
        await Promise.resolve();
        expect(emitted).toEqual([1]);
      });
    });
    describe('when next() result is Promise', () => {
      it('should return Observable', async () => {
        const val = 3;
        const next = async () => val;
        expect(await lastValueFrom(consumer.transformDeferred(next))).toEqual(
          val,
        );
      });
    });
    describe('when next() result is Observable', () => {
      it('should return Observable', async () => {
        const val = 3;
        const next = async () => of(val);
        expect(
          await lastValueFrom(consumer.transformDeferred(next) as any),
        ).toEqual(val);
      });
    });
    describe('when next() result is an Observable from another copy of rxjs', () => {
      it('should return Observable of the values it emits', async () => {
        // Not an instance of the "Observable" class imported here
        const source$ = of(3);
        const foreign$ = {
          lift: source$.lift.bind(source$),
          subscribe: source$.subscribe.bind(source$),
          [observable]: () => source$,
        };
        const next = async () => foreign$;
        expect(
          await lastValueFrom(consumer.transformDeferred(next) as any),
        ).toEqual(3);
      });
    });
    describe('when the subscriber is closed before the async handler resolves', () => {
      it('should not subscribe the producer Observable after the consumer has unsubscribed', async () => {
        const teardown = vi.fn();
        const subscribed = vi.fn();

        const next = () =>
          new Promise<Observable<never>>(resolve =>
            setTimeout(
              () =>
                resolve(
                  new Observable(() => {
                    subscribed();
                    return teardown;
                  }),
                ),
              50,
            ),
          );

        const obs$ = consumer.transformDeferred(next);
        const sub = obs$.subscribe({ error: () => {} });

        // Unsubscribe before the 50 ms delay resolves — simulates SSE client disconnect
        sub.unsubscribe();

        // Wait long enough for the async handler to resolve
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(subscribed).not.toHaveBeenCalled();
        expect(teardown).not.toHaveBeenCalled();
      });

      it('should destroy the stream of a StreamableFile it drops', async () => {
        // e.g. one returned after a timeout() interceptor gave up
        const stream = new PassThrough();
        let resolveNext!: (file: StreamableFile) => void;
        const next = () =>
          new Promise<StreamableFile>(resolve => (resolveNext = resolve));

        const sub = consumer
          .transformDeferred(next)
          .subscribe({ error: () => {} });
        sub.unsubscribe();
        resolveNext(new StreamableFile(stream));
        await new Promise(resolve => setImmediate(resolve));

        expect(stream.destroyed).toBe(true);
      });

      it('should cancel a web Response it drops', async () => {
        const cancel = vi.fn();
        let resolveNext!: (response: Response) => void;
        const next = () =>
          new Promise<Response>(resolve => (resolveNext = resolve));

        const sub = consumer
          .transformDeferred(next)
          .subscribe({ error: () => {} });
        sub.unsubscribe();
        resolveNext(new Response(new ReadableStream({ cancel })));
        await new Promise(resolve => setImmediate(resolve));

        expect(cancel).toHaveBeenCalledTimes(1);
      });
    });
  });
  describe('deferred promise conversion', () => {
    it('should convert promise to observable deferred', async () => {
      class TestError extends Error {}
      const testInterceptors = [
        {
          intercept: vi.fn().mockImplementation(async (ctx, handler) => {
            return merge(
              handler.handle(),
              defer(() => {
                throw new TestError();
              }),
            );
          }),
        },
        {
          intercept: vi
            .fn()
            .mockImplementation(async (ctx, handler) => handler.handle()),
        },
        {
          intercept: vi
            .fn()
            .mockImplementation(async (ctx, handler) => handler.handle()),
        },
      ];

      const observable = await consumer.intercept(
        testInterceptors,
        null!,
        { constructor: null },
        null!,
        async () => 1,
      );

      try {
        await transformToResult(observable);
      } catch (error) {
        if (!(error instanceof TestError)) {
          throw error;
        }
      }
      expect(testInterceptors[2].intercept).not.toHaveBeenCalled();
    });
  });
});

async function transformToResult(resultOrDeferred: any) {
  if (resultOrDeferred && typeof resultOrDeferred.subscribe === 'function') {
    return lastValueFrom(resultOrDeferred);
  }
  return resultOrDeferred;
}
