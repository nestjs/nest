import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { expect } from 'chai';
import * as sinon from 'sinon';
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
        it('should emit the unknown error payload and log the error when it holds an error', () => {
          const loggerErrorStub = sinon.stub(
            (WsExceptionsHandler as any).logger,
            'error',
          );
          const error = Object.assign(new Error('Request failed'), {
            config: { headers: { Authorization: 'Bearer secret' } },
          });

          try {
            handler.handle(new WsException(error), executionContextHost);
            expect(emitStub.calledOnce).to.be.true;
            expect(emitStub.firstCall.args).to.eql([
              'exception',
              {
                status: 'error',
                message: 'Internal server error',
                cause: {
                  pattern,
                  data,
                },
              },
            ]);
            expect(loggerErrorStub.calledWith(error)).to.be.true;
          } finally {
            loggerErrorStub.restore();
          }
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

    describe('when the error payload cannot be sent with its cause', () => {
      let loggerErrorStub: sinon.SinonStub;

      beforeEach(() => {
        loggerErrorStub = sinon.stub(
          (WsExceptionsHandler as any).logger,
          'error',
        );
      });

      afterEach(() => {
        loggerErrorStub.restore();
      });

      it('should log an unknown exception and emit the error without the cause', () => {
        emitStub.onFirstCall().throws(new RangeError('Maximum call stack'));
        const error = new Error('test');
        handler.handle(error, executionContextHost);

        expect(loggerErrorStub.calledWith(error)).to.be.true;
        expect(emitStub.calledTwice).to.be.true;
        expect(emitStub.secondCall.args).to.eql([
          'exception',
          { status: 'error', message: 'Internal server error' },
        ]);
      });

      it('should emit the error again without the cause when "emit" throws', () => {
        emitStub
          .onFirstCall()
          .throws(new RangeError('Maximum call stack size exceeded'));
        handler.handle(new WsException('Unauthorized'), executionContextHost);

        expect(loggerErrorStub.called).to.be.false;
        expect(emitStub.calledTwice).to.be.true;
        expect(emitStub.secondCall.args).to.eql([
          'exception',
          { status: 'error', message: 'Unauthorized' },
        ]);
      });

      it('should log an unknown exception and rethrow when there is no cause to drop', () => {
        handler = new WsExceptionsHandler({ includeCause: false });
        const error = new Error('test');
        const emitError = new Error('emit');
        emitStub.throws(emitError);

        expect(() => handler.handle(error, executionContextHost)).to.throw(
          emitError,
        );
        expect(emitStub.calledOnce).to.be.true;
        expect(loggerErrorStub.calledWith(error)).to.be.true;
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
});
