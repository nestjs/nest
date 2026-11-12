import { lastValueFrom, throwError } from 'rxjs';
import { WsProxy } from '../../context/ws-proxy.js';
import { WsException } from '../../errors/ws-exception.js';
import { WsExceptionsHandler } from '../../exceptions/ws-exceptions-handler.js';

describe('WsProxy', () => {
  let routerProxy: WsProxy;
  let handler: WsExceptionsHandler;

  beforeEach(() => {
    handler = new WsExceptionsHandler();
    routerProxy = new WsProxy();
  });

  describe('create', () => {
    it('should method return thunk', () => {
      const proxy = routerProxy.create(async (client, data) => {}, handler);
      expect(typeof proxy === 'function').toBe(true);
    });

    it('should method encapsulate callback passed as argument', async () => {
      const handleSpy = vi
        .spyOn(handler, 'handle')
        .mockImplementation(() => {});
      const proxy = routerProxy.create(async (client, data) => {
        throw new WsException('test');
      }, handler);
      await proxy(null, null);
      expect(handleSpy).toHaveBeenCalledOnce();
    });

    it('should attach "catchError" operator when observable was returned', async () => {
      const handleSpy = vi
        .spyOn(handler, 'handle')
        .mockImplementation(() => {});
      const proxy = routerProxy.create(async (client, data) => {
        return throwError(() => new WsException('test'));
      }, handler);
      (await proxy(null, null)).subscribe({
        error: () => {
          expect(handleSpy).toHaveBeenCalledOnce();
        },
      });
    });

    describe('when an asynchronous exception filter handles the error', () => {
      let finishFilter: () => void;
      beforeEach(() => {
        vi.spyOn(handler, 'handle').mockImplementation(
          () => new Promise<void>(resolve => (finishFilter = resolve)),
        );
      });
      const isSettled = async (promise: Promise<unknown>) => {
        let settled = false;
        void promise.then(() => (settled = true));
        await new Promise(resolve => setImmediate(resolve));
        return settled;
      };

      it('should resolve once the filter is done', async () => {
        const proxy = routerProxy.create(async () => {
          throw new WsException('test');
        }, handler);

        const result = proxy(null, null);
        expect(await isSettled(result)).toBe(false);

        finishFilter();
        expect(await isSettled(result)).toBe(true);
      });

      it('should complete the returned observable once the filter is done', async () => {
        const proxy = routerProxy.create(
          async () => throwError(() => new WsException('test')),
          handler,
        );

        const completed = lastValueFrom(await proxy(null, null), {
          defaultValue: 'completed',
        });
        expect(await isSettled(completed)).toBe(false);

        finishFilter();
        expect(await completed).toBe('completed');
      });
    });

    it('should reject when an asynchronous exception filter rejects', async () => {
      const error = new Error('filter failed');
      vi.spyOn(handler, 'handle').mockImplementation(() =>
        Promise.reject(error),
      );
      const proxy = routerProxy.create(async () => {
        throw new WsException('test');
      }, handler);

      await expect(proxy(null, null)).rejects.toBe(error);
    });
  });
});
