import { throwError } from 'rxjs';
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
  });
});
