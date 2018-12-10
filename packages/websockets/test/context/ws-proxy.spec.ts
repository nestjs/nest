import { expect } from 'chai';
import { of, throwError } from 'rxjs';
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
    it('should method return thunk', async () => {
      const proxy = await routerProxy.create(async (client, data) => {},
      handler);
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
        return throwError(new WsException('test'));
      }, handler);
      (await proxy(null, null)).subscribe(null, () => expectation.verify());
    });
  });

  describe('isObservable', () => {
    describe('when observable', () => {
      it('should return true', () => {
        expect(routerProxy.isObservable(of('test'))).to.be.true;
      });
    });
    describe('when not observable', () => {
      it('should return false', () => {
        expect(routerProxy.isObservable({})).to.be.false;
      });
    });
  });
});
