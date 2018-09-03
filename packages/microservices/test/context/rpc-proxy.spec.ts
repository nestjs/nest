import * as sinon from 'sinon';
import { expect } from 'chai';
import { RpcProxy } from '../../context/rpc-proxy';
import { RpcExceptionsHandler } from '../../exceptions/rpc-exceptions-handler';
import { RpcException } from '../../exceptions/rpc-exception';
import { Observable, of } from 'rxjs';

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
      const proxy = await routerProxy.create(
        async data => of(true),
        handler,
      );
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
  });
});
