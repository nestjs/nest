import * as sinon from 'sinon';
import { expect } from 'chai';
import { RouterProxy } from '../../router/router-proxy';
import { ExceptionsHandler } from '../../exceptions/exceptions-handler';
import { HttpException } from '../../exceptions/http-exception';

describe('RouterProxy', () => {
  let routerProxy: RouterProxy;
  let handlerMock: sinon.SinonMock;
  let handler: ExceptionsHandler;

  beforeEach(() => {
    handler = new ExceptionsHandler();
    handlerMock = sinon.mock(handler);
    routerProxy = new RouterProxy();
  });

  describe('createProxy', () => {
    it('should method return thunk', () => {
      const proxy = routerProxy.createProxy(() => {}, handler);
      expect(typeof proxy === 'function').to.be.true;
    });

    it('should method encapsulate callback passed as argument', () => {
      const expectation = handlerMock.expects('next').once();
      const proxy = routerProxy.createProxy((req, res, next) => {
        throw new HttpException('test', 500);
      }, handler);
      proxy(null, null, null);
      expectation.verify();
    });

    it('should method encapsulate async callback passed as argument', done => {
      const expectation = handlerMock.expects('next').once();
      const proxy = routerProxy.createProxy(async (req, res, next) => {
        throw new HttpException('test', 500);
      }, handler);
      proxy(null, null, null);

      setTimeout(() => {
        expectation.verify();
        done();
      }, 0);
    });
  });

  describe('createExceptionLayerProxy', () => {
    it('should method return thunk', () => {
      const proxy = routerProxy.createExceptionLayerProxy(() => {}, handler);
      expect(typeof proxy === 'function').to.be.true;
    });

    it('should method encapsulate callback passed as argument', () => {
      const expectation = handlerMock.expects('next').once();
      const proxy = routerProxy.createExceptionLayerProxy(
        (err, req, res, next) => {
          throw new HttpException('test', 500);
        },
        handler,
      );
      proxy(null, null, null, null);
      expectation.verify();
    });

    it('should method encapsulate async callback passed as argument', done => {
      const expectation = handlerMock.expects('next').once();
      const proxy = routerProxy.createExceptionLayerProxy(
        async (err, req, res, next) => {
          throw new HttpException('test', 500);
        },
        handler,
      );
      proxy(null, null, null, null);

      setTimeout(() => {
        expectation.verify();
        done();
      }, 0);
    });
  });
});
