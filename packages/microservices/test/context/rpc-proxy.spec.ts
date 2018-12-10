import { expect } from 'chai';
import { of, throwError } from 'rxjs';
import * as sinon from 'sinon';
import { RpcProxy } from '../../context/rpc-proxy';
import { RpcException } from '../../exceptions/rpc-exception';
import { RpcExceptionsHandler } from '../../exceptions/rpc-exceptions-handler';

describe('RpcProxy', () => {
  let routerProxy: RpcProxy;
  let handlerMock: sinon.SinonMock;
  let handler: RpcExceptionsHandler;

  beforeEach(() => {
    handler = new RpcExceptionsHandler();
    handlerMock = sinon.mock(handler);
    routerProxy = new RpcProxy();
  });

  describe('create', () => {
    it('should method return thunk', async () => {
      const proxy = await routerProxy.create(async data => of(true), handler);
      expect(typeof proxy === 'function').to.be.true;
    });

    it('should method encapsulate callback passed as argument', async () => {
      const expectation = handlerMock.expects('handle').once();
      const proxy = routerProxy.create(async data => {
        throw new RpcException('test');
      }, handler);
      await proxy(null);
      expectation.verify();
    });

    it('should attach "catchError" operator when observable was returned', async () => {
      const expectation = handlerMock.expects('handle').once();
      const proxy = routerProxy.create(async (client, data) => {
        return throwError(new RpcException('test'));
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
