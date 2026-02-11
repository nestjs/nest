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
  });
});
