import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { Observable, defer, lastValueFrom, merge, of, retry } from 'rxjs';
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
  describe('createContext', () => {
    it('should return execution context object', () => {
      const instance = { constructor: {} };
      const callback = () => null;
      const context = consumer.createContext([], instance, callback);

      expect(context.getClass()).toEqual(instance.constructor);
      expect(context.getHandler()).toEqual(callback);
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
