import { Logger } from '@nestjs/common';
import type { MockInstance } from 'vitest';
import { EMPTY, lastValueFrom, of, throwError } from 'rxjs';
import { RpcProxy } from '../../context/rpc-proxy.js';
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
      (await proxy(null, null)).subscribe({
        error: () => {
          expect(handleSpy).toHaveBeenCalledOnce();
        },
      });
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
});
