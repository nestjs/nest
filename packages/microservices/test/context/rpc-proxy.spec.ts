import { expect } from 'chai';
import { lastValueFrom, of, throwError } from 'rxjs';
import * as sinon from 'sinon';
import { RpcProxy } from '../../context/rpc-proxy';
import { BaseRpcExceptionFilter } from '../../exceptions/base-rpc-exception-filter';
import { KafkaRetriableException } from '../../exceptions/kafka-retriable-exception';
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
      const proxy = routerProxy.create(async data => of(true), handler);
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
        return throwError(() => new RpcException('test'));
      }, handler);
      (await proxy(null, null)).subscribe({
        error: () => expectation.verify(),
      });
    });
  });

  describe('when a filter fails while handling the error of a stream', () => {
    const filterError = new Error('filter failed');
    let loggerErrorStub: sinon.SinonStub;

    beforeEach(() => {
      loggerErrorStub = sinon.stub(
        (BaseRpcExceptionFilter as any).logger,
        'error',
      );
    });
    afterEach(() => {
      loggerErrorStub.restore();
    });

    const failWith = (func: () => unknown) =>
      handler.setCustomFilters([
        { exceptionMetatypes: [RpcException], func: func as any },
      ]);
    const createStreamProxy = () =>
      routerProxy.create(
        async () => throwError(() => new RpcException('test')),
        handler,
      );
    const reasonOf = (promise: Promise<unknown>) =>
      promise.then(
        () => expect.fail('should have rejected'),
        (err: unknown) => err,
      );

    (
      [
        [
          'throws',
          () => {
            throw filterError;
          },
        ],
        [
          'rejects',
          async () => {
            throw filterError;
          },
        ],
      ] as const
    ).forEach(([description, filter]) => {
      it(`should answer as an unknown error and log it when the filter ${description}`, async () => {
        failWith(filter);

        expect(
          await reasonOf(lastValueFrom(await createStreamProxy()(null))),
        ).to.deep.equal({
          status: 'error',
          message: 'Internal server error',
        });
        expect(loggerErrorStub.calledWith(filterError)).to.be.true;
      });
    });

    ['throws', 'rejects'].forEach(how => {
      it(`should pass on an exception that returns itself from "getError" when the filter ${how}`, async () => {
        const retriable = new KafkaRetriableException('retry me');
        failWith(
          how === 'throws'
            ? () => {
                throw retriable;
              }
            : async () => {
                throw retriable;
              },
        );

        expect(
          await reasonOf(lastValueFrom(await createStreamProxy()(null))),
        ).to.equal(retriable);
        expect(loggerErrorStub.called).to.be.false;
      });
    });

    it('should still reject the handler promise when the filter fails for a handler that rejects', async () => {
      // The transport handles it
      failWith(() => {
        throw filterError;
      });
      const proxy = routerProxy.create(async () => {
        throw new RpcException('test');
      }, handler);

      expect(await reasonOf(proxy(null))).to.equal(filterError);
    });
  });
});
