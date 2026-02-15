import { of, throwError } from 'rxjs';
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
});
