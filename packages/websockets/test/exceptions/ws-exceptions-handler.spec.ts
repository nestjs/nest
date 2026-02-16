import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { WsException } from '../../errors/ws-exception.js';
import { WsExceptionsHandler } from '../../exceptions/ws-exceptions-handler.js';

describe('WsExceptionsHandler', () => {
  let handler: WsExceptionsHandler;
  let emitStub: ReturnType<typeof vi.fn>;
  let client: {
    emit: ReturnType<typeof vi.fn>;
  };
  let pattern: string;
  let data: unknown;
  let executionContextHost: ExecutionContextHost;

  beforeEach(() => {
    handler = new WsExceptionsHandler();
    emitStub = vi.fn();
    client = {
      emit: emitStub,
    };
    pattern = 'test';
    data = { foo: 'bar' };
    executionContextHost = new ExecutionContextHost([client, data, pattern]);

    client.emit.mockReturnValue(client);
  });

  describe('handle', () => {
    describe('when "includeCause" is set to true (default)', () => {
      it('should method emit expected status code message when exception is unknown', () => {
        handler.handle(new Error(), executionContextHost);
        expect(emitStub).toHaveBeenCalledWith('exception', {
          status: 'error',
          message: 'Internal server error',
          cause: {
            pattern,
            data,
          },
        });
      });
      describe('when exception is instance of WsException', () => {
        it('should method emit expected status and json object', () => {
          const message = {
            custom: 'Unauthorized',
          };
          handler.handle(new WsException(message), executionContextHost);
          expect(emitStub).toHaveBeenCalledWith('exception', message);
        });
        it('should method emit expected status and transform message to json', () => {
          const message = 'Unauthorized';

          handler.handle(new WsException(message), executionContextHost);
          console.log(emitStub.mock.calls[0]);
          expect(emitStub).toHaveBeenCalledWith('exception', {
            message,
            status: 'error',
            cause: {
              pattern,
              data,
            },
          });
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
        expect(emitStub).toHaveBeenCalledWith('exception', {
          status: 'error',
          message: 'Internal server error',
        });
      });
      describe('when exception is instance of WsException', () => {
        it('should method emit expected status and json object', () => {
          const message = {
            custom: 'Unauthorized',
          };
          handler.handle(new WsException(message), executionContextHost);
          expect(emitStub).toHaveBeenCalledWith('exception', message);
        });
        it('should method emit expected status and transform message to json', () => {
          const message = 'Unauthorized';

          handler.handle(new WsException(message), executionContextHost);
          expect(emitStub).toHaveBeenCalledWith('exception', {
            message,
            status: 'error',
          });
        });
      });
    });

    describe('when client uses "send" instead of "emit" (native WebSocket)', () => {
      let sendStub: sinon.SinonStub;
      let wsClient: { send: sinon.SinonStub; readyState: number };
      let wsExecutionContextHost: ExecutionContextHost;

      beforeEach(() => {
        handler = new WsExceptionsHandler();
        sendStub = sinon.stub();
        wsClient = { send: sendStub, readyState: 1 };
        wsExecutionContextHost = new ExecutionContextHost([
          wsClient,
          data,
          pattern,
        ]);
      });

      it('should send JSON-stringified error via "send" when exception is unknown', () => {
        handler.handle(new Error(), wsExecutionContextHost);
        expect(sendStub.calledOnce).to.be.true;
        const sent = JSON.parse(sendStub.getCall(0).args[0]);
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

      it('should send JSON-stringified error via "send" for WsException with object', () => {
        const message = { custom: 'Unauthorized' };
        handler.handle(new WsException(message), wsExecutionContextHost);
        expect(sendStub.calledOnce).to.be.true;
        const sent = JSON.parse(sendStub.getCall(0).args[0]);
        expect(sent).to.deep.equal({
          event: 'exception',
          data: message,
        });
      });

      it('should send JSON-stringified error via "send" for WsException with string', () => {
        const message = 'Unauthorized';
        handler.handle(new WsException(message), wsExecutionContextHost);
        expect(sendStub.calledOnce).to.be.true;
        const sent = JSON.parse(sendStub.getCall(0).args[0]);
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

      describe('when "includeCause" is set to false', () => {
        beforeEach(() => {
          handler = new WsExceptionsHandler({ includeCause: false });
        });

        it('should send error without cause via "send"', () => {
          const message = 'Unauthorized';
          handler.handle(new WsException(message), wsExecutionContextHost);
          expect(sendStub.calledOnce).to.be.true;
          const sent = JSON.parse(sendStub.getCall(0).args[0]);
          expect(sent).to.deep.equal({
            event: 'exception',
            data: {
              message,
              status: 'error',
            },
          });
        });
      });
    });

    describe('when "invokeCustomFilters" returns true', () => {
      beforeEach(() => {
        vi.spyOn(handler, 'invokeCustomFilters').mockReturnValue(true);
      });
      it('should not call `emit`', () => {
        handler.handle(new WsException(''), executionContextHost);
        expect(emitStub).not.toHaveBeenCalled();
      });
    });
  });
  describe('setCustomFilters', () => {
    const filters = ['test', 'test2'];
    it('should set custom filters', () => {
      handler.setCustomFilters(filters as any);
      expect((handler as any).filters).toEqual(filters);
    });
    it('should throw exception when passed argument is not an array', () => {
      expect(() => handler.setCustomFilters(null!)).toThrow();
    });
  });
  describe('invokeCustomFilters', () => {
    describe('when filters array is empty', () => {
      it('should return false', () => {
        expect(handler.invokeCustomFilters(null, null!)).toBe(false);
      });
    });
    describe('when filters array is not empty', () => {
      let filters: any[], funcSpy: ReturnType<typeof vi.fn>;
      class TestException {}

      beforeEach(() => {
        funcSpy = vi.fn();
      });
      describe('when filter exists in filters array', () => {
        beforeEach(() => {
          filters = [{ exceptionMetatypes: [TestException], func: funcSpy }];
          (handler as any).filters = filters;
        });
        it('should call funcSpy', () => {
          handler.invokeCustomFilters(new TestException(), null!);
          expect(funcSpy).toHaveBeenCalled();
        });
        it('should call funcSpy with exception and response passed as an arguments', () => {
          const exception = new TestException();
          const res = { foo: 'bar' };

          handler.invokeCustomFilters(exception, res as any);
          expect(funcSpy).toHaveBeenCalledWith(exception, res);
        });
        it('should return true', () => {
          expect(handler.invokeCustomFilters(new TestException(), null!)).toBe(
            true,
          );
        });
      });
      describe('when filter does not exists in filters array', () => {
        it('should not call funcSpy', () => {
          handler.invokeCustomFilters(new TestException(), null!);
          expect(funcSpy).not.toHaveBeenCalled();
        });
        it('should return false', () => {
          expect(handler.invokeCustomFilters(new TestException(), null!)).toBe(
            false,
          );
        });
      });
    });
  });
});
