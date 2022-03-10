import { AssertionError, expect } from 'chai';
import { of } from 'rxjs';
import * as sinon from 'sinon';
import { KafkaRpcProxy } from '../../context/kafka-rpc-proxy';
import { RpcProxy } from '../../context/rpc-proxy';
import { RpcException } from '../../exceptions/rpc-exception';
import { RpcExceptionsHandler } from '../../exceptions/rpc-exceptions-handler';

describe('KafkaRpcProxy', () => {
  let routerProxy: RpcProxy;
  let handlerMock: sinon.SinonMock;
  let handler: RpcExceptionsHandler;

  beforeEach(() => {
    handler = new RpcExceptionsHandler();
    handlerMock = sinon.mock(handler);
    routerProxy = new KafkaRpcProxy();
  });

  describe('create', () => {
    it('should method return thunk', async () => {
      const proxy = await routerProxy.create(async data => of(true), handler);
      expect(typeof proxy === 'function').to.be.true;
    });

    it('should method encapsulate callback passed as argument', async () => {
      const error = new RpcException('test');
      const proxy = routerProxy.create(async data => {
        throw error;
      }, handler);

      try {
        await proxy(null);

        // code should not be executed
        expect(true).to.be.false;
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }
        expect(e).to.be.eq(error);
      }
    });
  });
});
