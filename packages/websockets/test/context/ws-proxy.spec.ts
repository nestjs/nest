import { expect } from 'chai';
import { lastValueFrom, throwError } from 'rxjs';
import * as sinon from 'sinon';
import { WsProxy } from '../../context/ws-proxy';
import { WsException } from '../../errors/ws-exception';
import { WsExceptionsHandler } from '../../exceptions/ws-exceptions-handler';

describe('WsProxy', () => {
  let routerProxy: WsProxy;
  let handlerMock: sinon.SinonMock;
  let handler: WsExceptionsHandler;

  beforeEach(() => {
    handler = new WsExceptionsHandler();
    handlerMock = sinon.mock(handler);
    routerProxy = new WsProxy();
  });

  describe('create', () => {
    it('should method return thunk', () => {
      const proxy = routerProxy.create(async (client, data) => {}, handler);
      expect(typeof proxy === 'function').to.be.true;
    });

    it('should method encapsulate callback passed as argument', async () => {
      const expectation = handlerMock.expects('handle').once();
      const proxy = routerProxy.create(async (client, data) => {
        throw new WsException('test');
      }, handler);
      await proxy(null, null);
      expectation.verify();
    });

    it('should attach "catchError" operator when observable was returned', async () => {
      const expectation = handlerMock.expects('handle').once();
      const proxy = routerProxy.create(async (client, data) => {
        return throwError(() => new WsException('test'));
      }, handler);
      (await proxy(null, null)).subscribe(null, () => expectation.verify());
    });

    describe('when an asynchronous exception filter handles the error', () => {
      let finishFilter: () => void;
      beforeEach(() => {
        sinon
          .stub(handler, 'handle')
          .callsFake(
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
        expect(await isSettled(result)).to.be.false;

        finishFilter();
        expect(await isSettled(result)).to.be.true;
      });

      it('should complete the returned observable once the filter is done', async () => {
        const proxy = routerProxy.create(
          async () => throwError(() => new WsException('test')),
          handler,
        );

        const completed = lastValueFrom(await proxy(null, null), {
          defaultValue: 'completed',
        });
        expect(await isSettled(completed)).to.be.false;

        finishFilter();
        expect(await completed).to.equal('completed');
      });
    });

    it('should reject when an asynchronous exception filter rejects', async () => {
      const error = new Error('filter failed');
      sinon.stub(handler, 'handle').callsFake(() => Promise.reject(error));
      const proxy = routerProxy.create(async () => {
        throw new WsException('test');
      }, handler);

      let failure: unknown;
      await proxy(null, null).catch(err => (failure = err));
      expect(failure).to.equal(error);
    });
  });
});
