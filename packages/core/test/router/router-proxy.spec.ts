import { HttpException } from '../../../common/exceptions/http.exception.js';
import { ExceptionsHandler } from '../../exceptions/exceptions-handler.js';
import { ExecutionContextHost } from '../../helpers/execution-context-host.js';
import { RouterProxy } from '../../router/router-proxy.js';
import { NoopHttpAdapter } from '../utils/noop-adapter.js';

describe('RouterProxy', () => {
  let routerProxy: RouterProxy;
  let handler: ExceptionsHandler;
  const httpException = new HttpException('test', 500);
  let nextStub: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    handler = new ExceptionsHandler(new NoopHttpAdapter({}));
    nextStub = vi.spyOn(handler, 'next').mockImplementation(() => ({}) as any);
    routerProxy = new RouterProxy();
  });

  describe('createProxy', () => {
    it('should method return thunk', () => {
      const proxy = routerProxy.createProxy(() => {}, handler);
      expect(typeof proxy === 'function').toBe(true);
    });

    it('should method encapsulate callback passed as argument', async () => {
      const proxy = routerProxy.createProxy((req, res, next) => {
        throw httpException;
      }, handler);
      await proxy(null, null, null!);

      expect(nextStub).toHaveBeenCalledOnce();
      expect(nextStub).toHaveBeenCalledWith(
        httpException,
        new ExecutionContextHost([null, null, null]),
      );
    });

    it('should method encapsulate async callback passed as argument', async () => {
      const proxy = routerProxy.createProxy(async (req, res, next) => {
        throw httpException;
      }, handler);

      await proxy(null, null, null!);

      expect(nextStub).toHaveBeenCalledOnce();
      expect(nextStub).toHaveBeenCalledWith(
        httpException,
        new ExecutionContextHost([null, null, null]),
      );
    });
  });

  describe('createExceptionLayerProxy', () => {
    it('should method return thunk', () => {
      const proxy = routerProxy.createExceptionLayerProxy(() => {}, handler);
      expect(typeof proxy === 'function').toBe(true);
    });

    it('should method encapsulate callback passed as argument', async () => {
      const proxy = routerProxy.createExceptionLayerProxy(
        (err, req, res, next) => {
          throw httpException;
        },
        handler,
      );
      await proxy(null, null, null, null!);

      expect(nextStub).toHaveBeenCalledOnce();
      expect(nextStub).toHaveBeenCalledWith(
        httpException,
        new ExecutionContextHost([null, null, null]),
      );
    });

    it('should method encapsulate async callback passed as argument', async () => {
      const proxy = routerProxy.createExceptionLayerProxy(
        async (err, req, res, next) => {
          throw httpException;
        },
        handler,
      );

      await proxy(null, null, null, null!);

      expect(nextStub).toHaveBeenCalledOnce();
      expect(nextStub).toHaveBeenCalledWith(
        httpException,
        new ExecutionContextHost([null, null, null]),
      );
    });
  });
});
