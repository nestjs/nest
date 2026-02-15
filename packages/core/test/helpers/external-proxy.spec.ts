import { HttpException } from '../../../common/exceptions/http.exception.js';
import { ExternalExceptionsHandler } from '../../exceptions/external-exceptions-handler.js';
import { ExternalErrorProxy } from '../../helpers/external-proxy.js';

describe('ExternalErrorProxy', () => {
  let externalErrorProxy: ExternalErrorProxy;
  let handler: ExternalExceptionsHandler;

  beforeEach(() => {
    handler = new ExternalExceptionsHandler();
    externalErrorProxy = new ExternalErrorProxy();
  });

  describe('createProxy', () => {
    it('should method return thunk', () => {
      const proxy = externalErrorProxy.createProxy(() => {}, handler);
      expect(typeof proxy === 'function').toBe(true);
    });

    it('should method encapsulate callback passed as argument', async () => {
      const nextSpy = vi
        .spyOn(handler, 'next')
        .mockImplementation(async () => {});
      const proxy = externalErrorProxy.createProxy((req, res, next) => {
        throw new HttpException('test', 500);
      }, handler);
      await proxy(null, null, null);
      expect(nextSpy).toHaveBeenCalledOnce();
    });

    it('should method encapsulate async callback passed as argument', async () => {
      const nextSpy = vi
        .spyOn(handler, 'next')
        .mockImplementation(async () => {});
      const proxy = externalErrorProxy.createProxy(async (req, res, next) => {
        throw new HttpException('test', 500);
      }, handler);

      await proxy(null, null, null);

      expect(nextSpy).toHaveBeenCalledOnce();
    });

    it('should return the value when callback succeeds', async () => {
      const proxy = externalErrorProxy.createProxy(() => 'success', handler);
      const result = await proxy();
      expect(result).toBe('success');
    });

    it('should return value from async callback', async () => {
      const proxy = externalErrorProxy.createProxy(
        async () => 'async-result',
        handler,
      );
      const result = await proxy();
      expect(result).toBe('async-result');
    });

    it('should pass a type to the ExecutionContextHost on error', async () => {
      const nextSpy = vi
        .spyOn(handler, 'next')
        .mockImplementation(async () => {});
      const proxy = externalErrorProxy.createProxy(
        () => {
          throw new HttpException('test', 400);
        },
        handler,
        'ws',
      );
      await proxy('arg1');

      expect(nextSpy).toHaveBeenCalledOnce();
      const contextArg = nextSpy.mock.calls[0][1];
      expect(contextArg.getType()).toBe('ws');
    });
  });
});
