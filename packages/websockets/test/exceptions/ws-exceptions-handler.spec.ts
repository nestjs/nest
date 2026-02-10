import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { BaseWsExceptionFilter } from '../../exceptions/base-ws-exception-filter';
import { WsException } from '../../errors/ws-exception';
import { WsExceptionsHandler } from '../../exceptions/ws-exceptions-handler';

describe('WsExceptionsHandler', () => {
  let handler: WsExceptionsHandler;
  let emitStub: sinon.SinonStub;
  let client: {
    emit: sinon.SinonStub;
  };
  let pattern: string;
  let data: unknown;
  let executionContextHost: ExecutionContextHost;

  beforeEach(() => {
    handler = new WsExceptionsHandler();
    emitStub = sinon.stub();
    client = {
      emit: emitStub,
    };
    pattern = 'test';
    data = { foo: 'bar' };
    executionContextHost = new ExecutionContextHost([client, data, pattern]);

    client.emit.returns(client);
  });

  describe('handle', () => {
    describe('when "includeCause" is set to true (default)', () => {
      it('should method emit expected status code message when exception is unknown', () => {
        handler.handle(new Error(), executionContextHost);
        expect(
          emitStub.calledWith('exception', {
            status: 'error',
            message: 'Internal server error',
            cause: {
              pattern,
              data,
            },
          }),
        ).to.be.true;
      });
      describe('when exception is instance of WsException', () => {
        it('should method emit expected status and json object', () => {
          const message = {
            custom: 'Unauthorized',
          };
          handler.handle(new WsException(message), executionContextHost);
          expect(emitStub.calledWith('exception', message)).to.be.true;
        });
        it('should method emit expected status and transform message to json', () => {
          const message = 'Unauthorized';

          handler.handle(new WsException(message), executionContextHost);
          console.log(emitStub.getCall(0).args);
          expect(
            emitStub.calledWith('exception', {
              message,
              status: 'error',
              cause: {
                pattern,
                data,
              },
            }),
          ).to.be.true;
        });
      });
    });

    describe('when "includeCause" is set to false', () => {
      beforeEach(() => {
        handler = new WsExceptionsHandler({ includeCause: false });
      });

      it('should method emit expected status code message when exception is unknown', () => {
        handler.handle(
          new Error(),
          new ExecutionContextHost([client, pattern, data]),
        );
        expect(
          emitStub.calledWith('exception', {
            status: 'error',
            message: 'Internal server error',
          }),
        ).to.be.true;
      });
      describe('when exception is instance of WsException', () => {
        it('should method emit expected status and json object', () => {
          const message = {
            custom: 'Unauthorized',
          };
          handler.handle(new WsException(message), executionContextHost);
          expect(emitStub.calledWith('exception', message)).to.be.true;
        });
        it('should method emit expected status and transform message to json', () => {
          const message = 'Unauthorized';

          handler.handle(new WsException(message), executionContextHost);
          expect(emitStub.calledWith('exception', { message, status: 'error' }))
            .to.be.true;
        });
      });
    });

    describe('when "invokeCustomFilters" returns true', () => {
      beforeEach(() => {
        sinon.stub(handler, 'invokeCustomFilters').returns(true);
      });
      it('should not call `emit`', () => {
        handler.handle(new WsException(''), executionContextHost);
        expect(emitStub.notCalled).to.be.true;
      });
    });
  });
  describe('setCustomFilters', () => {
    const filters = ['test', 'test2'];
    it('should set custom filters', () => {
      handler.setCustomFilters(filters as any);
      expect((handler as any).filters).to.be.eql(filters);
    });
    it('should throw exception when passed argument is not an array', () => {
      expect(() => handler.setCustomFilters(null!)).to.throw();
    });
  });
  describe('invokeCustomFilters', () => {
    describe('when filters array is empty', () => {
      it('should return false', () => {
        expect(handler.invokeCustomFilters(null, null!)).to.be.false;
      });
    });
    describe('when filters array is not empty', () => {
      let filters: any[], funcSpy: sinon.SinonSpy;
      class TestException {}

      beforeEach(() => {
        funcSpy = sinon.spy();
      });
      describe('when filter exists in filters array', () => {
        beforeEach(() => {
          filters = [{ exceptionMetatypes: [TestException], func: funcSpy }];
          (handler as any).filters = filters;
        });
        it('should call funcSpy', () => {
          handler.invokeCustomFilters(new TestException(), null!);
          expect(funcSpy.notCalled).to.be.false;
        });
        it('should call funcSpy with exception and response passed as an arguments', () => {
          const exception = new TestException();
          const res = { foo: 'bar' };

          handler.invokeCustomFilters(exception, res as any);
          expect(funcSpy.calledWith(exception, res)).to.be.true;
        });
        it('should return true', () => {
          expect(handler.invokeCustomFilters(new TestException(), null!)).to.be
            .true;
        });
      });
      describe('when filter does not exists in filters array', () => {
        it('should not call funcSpy', () => {
          handler.invokeCustomFilters(new TestException(), null!);
          expect(funcSpy.notCalled).to.be.true;
        });
        it('should return false', () => {
          expect(handler.invokeCustomFilters(new TestException(), null!)).to.be
            .false;
        });
      });
    });
  });

  describe('when client is a native WebSocket (ws library)', () => {
    let sendStub: sinon.SinonStub;
    let wsClient: {
      send: sinon.SinonStub;
      readyState: number;
    };
    let wsExecutionContextHost: ExecutionContextHost;

    beforeEach(() => {
      sendStub = sinon.stub();
      wsClient = {
        send: sendStub,
        readyState: 1,
      };
      wsExecutionContextHost = new ExecutionContextHost([
        wsClient,
        data,
        pattern,
      ]);
    });

    it('should send JSON error via client.send when exception is unknown', () => {
      handler.handle(new Error(), wsExecutionContextHost);
      expect(sendStub.calledOnce).to.be.true;
      const sent = JSON.parse(sendStub.firstCall.args[0]);
      expect(sent).to.deep.equal({
        event: 'exception',
        data: {
          status: 'error',
          message: 'Internal server error',
          cause: {
            pattern,
            data,
          },
        },
      });
    });

    it('should send JSON error via client.send when WsException has string message', () => {
      const message = 'Unauthorized';
      handler.handle(new WsException(message), wsExecutionContextHost);
      expect(sendStub.calledOnce).to.be.true;
      const sent = JSON.parse(sendStub.firstCall.args[0]);
      expect(sent).to.deep.equal({
        event: 'exception',
        data: {
          message,
          status: 'error',
          cause: {
            pattern,
            data,
          },
        },
      });
    });

    it('should send JSON error via client.send when WsException has object message', () => {
      const message = { custom: 'Unauthorized' };
      handler.handle(new WsException(message), wsExecutionContextHost);
      expect(sendStub.calledOnce).to.be.true;
      const sent = JSON.parse(sendStub.firstCall.args[0]);
      expect(sent).to.deep.equal({
        event: 'exception',
        data: message,
      });
    });

    it('should not send when readyState is not OPEN', () => {
      wsClient.readyState = 3;
      handler.handle(new WsException('test'), wsExecutionContextHost);
      expect(sendStub.notCalled).to.be.true;
    });
  });

  describe('when client has neither emit nor send', () => {
    it('should bail out without throwing', () => {
      const bareClient = {};
      const bareCtx = new ExecutionContextHost([bareClient, data, pattern]);
      expect(() => handler.handle(new WsException('test'), bareCtx)).to.not
        .throw;
    });
  });
});

describe('BaseWsExceptionFilter', () => {
  describe('isNativeWebSocket', () => {
    let filter: BaseWsExceptionFilter;

    beforeEach(() => {
      filter = new BaseWsExceptionFilter();
    });

    it('should return true for a raw ws client', () => {
      const wsClient = { send: () => {}, readyState: 1 };
      expect((filter as any).isNativeWebSocket(wsClient)).to.be.true;
    });

    it('should return false for a socket.io client (has nsp)', () => {
      const ioClient = {
        send: () => {},
        readyState: 1,
        emit: () => {},
        nsp: {},
      };
      expect((filter as any).isNativeWebSocket(ioClient)).to.be.false;
    });

    it('should return false for a client without send', () => {
      const client = { emit: () => {} };
      expect((filter as any).isNativeWebSocket(client)).to.be.false;
    });
  });
});
