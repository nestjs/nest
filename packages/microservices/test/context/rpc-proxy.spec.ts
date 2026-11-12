import { Logger } from '@nestjs/common';
import type { MockInstance } from 'vitest';
import { EMPTY, lastValueFrom, of, throwError, toArray } from 'rxjs';
import { RpcProxy } from '../../context/rpc-proxy.js';
import { BaseRpcExceptionFilter } from '../../exceptions/base-rpc-exception-filter.js';
import { KafkaRetriableException } from '../../exceptions/kafka-retriable-exception.js';
import { RpcException } from '../../exceptions/rpc-exception.js';
import { RpcExceptionsHandler } from '../../exceptions/rpc-exceptions-handler.js';

describe('RpcProxy', () => {
  let routerProxy: RpcProxy;
  let handler: RpcExceptionsHandler;

  beforeEach(() => {
    handler = new RpcExceptionsHandler();
    routerProxy = new RpcProxy();
  });

  describe('create', () => {
    it('should method return thunk', async () => {
      const proxy = routerProxy.create(async data => of(true), handler);
      expect(typeof proxy === 'function').toBe(true);
    });

    it('should method encapsulate callback passed as argument', async () => {
      const handleSpy = vi
        .spyOn(handler, 'handle')
        .mockImplementation(() => {});
      const proxy = routerProxy.create(async data => {
        throw new RpcException('test');
      }, handler);
      await proxy(null);
      expect(handleSpy).toHaveBeenCalledOnce();
    });

    it('should attach "catchError" operator when observable was returned', async () => {
      const handleSpy = vi
        .spyOn(handler, 'handle')
        .mockImplementation(() => {});
      const proxy = routerProxy.create(async (client, data) => {
        return throwError(() => new RpcException('test'));
      }, handler);
      await lastValueFrom(await proxy(null, null)).catch(() => {});
      expect(handleSpy).toHaveBeenCalledOnce();
    });
  });

  describe('when an async filter returns a failing stream', () => {
    const error = { status: 'error', message: 'from filter' };

    beforeEach(() => {
      handler.setCustomFilters([
        {
          exceptionMetatypes: [RpcException],
          func: (async () => throwError(() => error)) as any,
        },
      ]);
    });

    it('should fail with its error for a handler that rejects', async () => {
      const proxy = routerProxy.create(async () => {
        throw new RpcException('test');
      }, handler);

      await expect(lastValueFrom(await proxy(null))).rejects.toBe(error);
    });

    it('should fail with its error for a stream that errors', async () => {
      const proxy = routerProxy.create(
        async () => throwError(() => new RpcException('test')),
        handler,
      );

      await expect(lastValueFrom(await proxy(null))).rejects.toBe(error);
    });
  });

  describe('when a filter fails while handling the error of a stream', () => {
    const filterError = new Error('filter failed');
    let loggerErrorSpy: MockInstance;

    beforeEach(() => {
      loggerErrorSpy = vi
        .spyOn((BaseRpcExceptionFilter as any).logger, 'error')
        .mockImplementation(() => {});
    });
    afterEach(() => {
      loggerErrorSpy.mockRestore();
    });

    const failWith = (func: () => unknown) =>
      handler.setCustomFilters([
        { exceptionMetatypes: [RpcException], func: func as any },
      ]);
    const createStreamProxy = () =>
      routerProxy.create(
        async () => throwError(() => new RpcException('test')),
        handler,
      );

    it.each([
      [
        'throws',
        () => {
          throw filterError;
        },
      ],
      [
        'rejects',
        async () => {
          throw filterError;
        },
      ],
    ])(
      'should answer as an unknown error and log it when the filter %s',
      async (_, filter) => {
        failWith(filter);

        await expect(
          lastValueFrom(await createStreamProxy()(null)),
        ).rejects.toEqual({
          status: 'error',
          message: 'Internal server error',
        });
        expect(loggerErrorSpy).toHaveBeenCalledWith(filterError);
      },
    );

    it.each(['throws', 'rejects'])(
      'should pass on an exception that returns itself from "getError" when the filter %s',
      async how => {
        const retriable = new KafkaRetriableException('retry me');
        failWith(
          how === 'throws'
            ? () => {
                throw retriable;
              }
            : async () => {
                throw retriable;
              },
        );

        await expect(
          lastValueFrom(await createStreamProxy()(null)),
        ).rejects.toBe(retriable);
        expect(loggerErrorSpy).not.toHaveBeenCalled();
      },
    );

    it('should still reject the handler promise when the filter fails for a handler that rejects', async () => {
      // The transport answers it and logs the failure (see "handleRequest")
      failWith(() => {
        throw filterError;
      });
      const proxy = routerProxy.create(async () => {
        throw new RpcException('test');
      }, handler);

      await expect(proxy(null)).rejects.toBe(filterError);
    });
  });

  describe('when an async filter returns a stream of values', () => {
    beforeEach(() => {
      handler.setCustomFilters([
        {
          exceptionMetatypes: [RpcException],
          func: (async () => of('from filter')) as any,
        },
      ]);
    });

    it('should emit its values for a handler that rejects', async () => {
      const proxy = routerProxy.create(async () => {
        throw new RpcException('test');
      }, handler);

      expect(await lastValueFrom(await proxy(null))).toBe('from filter');
    });

    it('should emit its values for a stream that errors', async () => {
      const proxy = routerProxy.create(
        async () => throwError(() => new RpcException('test')),
        handler,
      );

      expect(await lastValueFrom(await proxy(null))).toBe('from filter');
    });
  });

  describe('when unhandled errors must be reported', () => {
    let logSpy: MockInstance;

    beforeEach(() => {
      logSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should report an RpcException, which nothing else logs', async () => {
      const proxy = routerProxy.create(
        async () => throwError(() => new RpcException('test')),
        handler,
        true,
      );
      await lastValueFrom(await proxy(null), { defaultValue: undefined }).catch(
        () => {},
      );

      expect(logSpy).toHaveBeenCalledOnce();
      expect(logSpy).toHaveBeenCalledWith(expect.any(RpcException));
    });

    it('should not add a second log to an error the exceptions handler already logs', async () => {
      const proxy = routerProxy.create(
        async () => throwError(() => new Error('test')),
        handler,
        true,
      );
      await lastValueFrom(await proxy(null), { defaultValue: undefined }).catch(
        () => {},
      );

      expect(logSpy).toHaveBeenCalledOnce();
    });

    it('should stay silent when a filter swallows the exception', async () => {
      vi.spyOn(handler, 'handle').mockImplementation(() => EMPTY);
      const proxy = routerProxy.create(
        async () => throwError(() => new RpcException('test')),
        handler,
        true,
      );
      await lastValueFrom(await proxy(null), { defaultValue: undefined });

      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should leave a matching custom filter to report on its own', async () => {
      handler.setCustomFilters([
        {
          exceptionMetatypes: [RpcException],
          func: (exception: RpcException) =>
            throwError(() => exception.getError()),
        },
      ]);
      const proxy = routerProxy.create(
        async () => throwError(() => new RpcException('test')),
        handler,
        true,
      );
      await lastValueFrom(await proxy(null), { defaultValue: undefined }).catch(
        () => {},
      );

      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should not report anything for a message handler', async () => {
      const proxy = routerProxy.create(
        async () => throwError(() => new RpcException('test')),
        handler,
      );
      await lastValueFrom(await proxy(null), { defaultValue: undefined }).catch(
        () => {},
      );

      expect(logSpy).not.toHaveBeenCalled();
    });
  });

  describe('when a filter returns a falsy value', () => {
    beforeEach(() => {
      handler.setCustomFilters([
        { exceptionMetatypes: [RpcException], func: () => null as any },
      ]);
    });

    it('should emit it for a handler that rejects', async () => {
      const proxy = routerProxy.create(async () => {
        throw new RpcException('test');
      }, handler);

      expect(await lastValueFrom(await proxy(null))).toBeNull();
    });

    it('should emit it for a stream that errors', async () => {
      const proxy = routerProxy.create(
        async () => throwError(() => new RpcException('test')),
        handler,
      );

      expect(await lastValueFrom(await proxy(null))).toBeNull();
    });
  });

  describe('when a filter returns a plain value', () => {
    it.each([
      ['a string', 'test'],
      ['an array', [1, 2]],
      ['an object', { status: 'ok' }],
      ['a number', 1],
    ])(
      'should emit %s as a single value for a stream that errors',
      async (_, value) => {
        handler.setCustomFilters([
          { exceptionMetatypes: [RpcException], func: () => value as any },
        ]);
        const proxy = routerProxy.create(
          async () => throwError(() => new RpcException('test')),
          handler,
        );

        expect(
          await lastValueFrom((await proxy(null)).pipe(toArray())),
        ).toEqual([value]);
      },
    );
  });
});
