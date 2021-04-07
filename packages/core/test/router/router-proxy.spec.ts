import { expect } from 'chai';
import * as sinon from 'sinon';
import { SinonSpy } from 'sinon';

import { HttpException } from '../../../common/exceptions/http.exception';
import { ExceptionsHandler } from '../../exceptions/exceptions-handler';
import { ExecutionContextHost } from '../../helpers/execution-context-host';
import { RouterProxy } from '../../router/router-proxy';
import { NoopHttpAdapter } from '../utils/noop-adapter.spec';

describe('RouterProxy', () => {
  let routerProxy: RouterProxy;
  let handler: ExceptionsHandler;
  const httpException = new HttpException('test', 500);
  let nextStub: sinon.SinonStub;
  beforeEach(() => {
    handler = new ExceptionsHandler(new NoopHttpAdapter({}));
    nextStub = sinon.stub(handler, 'next');
    routerProxy = new RouterProxy();
  });

  describe('createProxy', () => {
    it('should method return thunk', () => {
      const proxy = routerProxy.createProxy(() => {}, handler);
      expect(typeof proxy === 'function').to.be.true;
    });

    it('should method encapsulate callback passed as argument', () => {
      const proxy = routerProxy.createProxy((req, res, next) => {
        throw httpException;
      }, handler);
      proxy(null, null, null);

      expect(nextStub.calledOnce).to.be.true;
      expect(
        nextStub.calledWith(
          httpException,
          new ExecutionContextHost([null, null, null]),
        ),
      ).to.be.true;
    });

    it('should method encapsulate async callback passed as argument', done => {
      const proxy = routerProxy.createProxy(async (req, res, next) => {
        throw httpException;
      }, handler);
      proxy(null, null, null);

      setTimeout(() => {
        expect(nextStub.calledOnce).to.be.true;
        expect(
          nextStub.calledWith(
            httpException,
            new ExecutionContextHost([null, null, null]),
          ),
        ).to.be.true;
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
      const proxy = routerProxy.createExceptionLayerProxy(
        (err, req, res, next) => {
          throw httpException;
        },
        handler,
      );
      proxy(null, null, null, null);

      expect(nextStub.calledOnce).to.be.true;
      expect(
        nextStub.calledWith(
          httpException,
          new ExecutionContextHost([null, null, null]),
        ),
      ).to.be.true;
    });

    it('should method encapsulate async callback passed as argument', done => {
      const proxy = routerProxy.createExceptionLayerProxy(
        async (err, req, res, next) => {
          throw httpException;
        },
        handler,
      );
      proxy(null, null, null, null);

      setTimeout(() => {
        expect(nextStub.calledOnce).to.be.true;
        expect(
          nextStub.calledWith(
            httpException,
            new ExecutionContextHost([null, null, null]),
          ),
        ).to.be.true;
        done();
      }, 0);
    });
  });
});
