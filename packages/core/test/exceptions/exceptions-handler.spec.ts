import { HttpException } from '@nestjs/common';
import { isNil, isObject } from '@nestjs/common/utils/shared.utils';
import { expect } from 'chai';
import * as createHttpError from 'http-errors';
import { of, throwError } from 'rxjs';
import * as sinon from 'sinon';
import { PassThrough } from 'stream';
import { AbstractHttpAdapter } from '../../adapters';
import { InvalidExceptionFilterException } from '../../errors/exceptions/invalid-exception-filter.exception';
import { ExceptionsHandler } from '../../exceptions/exceptions-handler';
import { ExecutionContextHost } from '../../helpers/execution-context-host';
import { NoopHttpAdapter } from '../utils/noop-adapter.spec';

describe('ExceptionsHandler', () => {
  let adapter: AbstractHttpAdapter;
  let handler: ExceptionsHandler;
  let statusStub: sinon.SinonStub;
  let jsonStub: sinon.SinonStub;
  let response: any;

  beforeEach(() => {
    adapter = new NoopHttpAdapter({});
    handler = new ExceptionsHandler(adapter);
    statusStub = sinon.stub();
    jsonStub = sinon.stub();

    response = {
      status: statusStub,
      json: jsonStub,
    };
    response.status.returns(response);
    response.json.returns(response);
  });

  describe('next', () => {
    beforeEach(() => {
      sinon
        .stub(adapter, 'reply')
        .callsFake((responseRef: any, body: any, statusCode?: number) => {
          if (statusCode) {
            responseRef.status(statusCode);
          }
          if (isNil(body)) {
            return responseRef.send();
          }
          return isObject(body)
            ? responseRef.json(body)
            : responseRef.send(String(body));
        });
    });
    it('should send expected response status code and message when exception is unknown', () => {
      handler.next(new Error(), new ExecutionContextHost([0, response]));

      expect(statusStub.calledWith(500)).to.be.true;
      expect(
        jsonStub.calledWith({
          statusCode: 500,
          message: 'Internal server error',
        }),
      ).to.be.true;
    });
    describe('when exception is instantiated by "http-errors" library', () => {
      it('should send expected response status code and message', () => {
        const error = new createHttpError.NotFound('User does not exist');
        handler.next(error, new ExecutionContextHost([0, response]));

        expect(statusStub.calledWith(404)).to.be.true;
        expect(
          jsonStub.calledWith({
            statusCode: 404,
            message: 'User does not exist',
          }),
        ).to.be.true;
      });
      it('should not send the message of an error that must not be exposed', () => {
        // What "send" (res.sendFile(), express.static()) passes to next()
        const error = createHttpError(
          404,
          new Error("ENOENT: no such file or directory, stat '/srv/files/a'"),
          { expose: false },
        );
        handler.next(error, new ExecutionContextHost([0, response]));

        expect(statusStub.calledWith(404)).to.be.true;
        expect(
          jsonStub.calledWith({
            statusCode: 404,
            message: 'Not Found',
          }),
        ).to.be.true;
      });
      it('should not send the message of a 5xx error by default', () => {
        const error = new createHttpError.BadGateway('connect 10.0.0.1:5432');
        handler.next(error, new ExecutionContextHost([0, response]));

        expect(statusStub.calledWith(502)).to.be.true;
        expect(
          jsonStub.calledWith({
            statusCode: 502,
            message: 'Bad Gateway',
          }),
        ).to.be.true;
      });
    });
    describe('when exception is an instance of HttpException', () => {
      it('should send expected response status code and json object', () => {
        const status = 401;
        const message = {
          custom: 'Unauthorized',
        };
        handler.next(
          new HttpException(message, status),
          new ExecutionContextHost([0, response]),
        );

        expect(statusStub.calledWith(status)).to.be.true;
        expect(jsonStub.calledWith(message)).to.be.true;
      });
      it('should send expected response status code and transform message to json', () => {
        const status = 401;
        const message = 'Unauthorized';

        handler.next(
          new HttpException(message, status),
          new ExecutionContextHost([0, response]),
        );

        expect(statusStub.calledWith(status)).to.be.true;
        expect(jsonStub.calledWith({ message, statusCode: status })).to.be.true;
      });
    });
    // What an RPC exception filter (such as GrpcExceptionFilter) does when a
    // hybrid application binds it to its HTTP routes as a global filter
    describe('when a custom filter returns a stream', () => {
      it('should answer as if no filter had matched', () => {
        handler.setCustomFilters([
          {
            exceptionMetatypes: [],
            func: () => throwError(() => ({ code: 2 })),
          },
        ]);
        handler.next(
          new HttpException('Not Found', 404),
          new ExecutionContextHost([0, response]),
        );

        expect(statusStub.calledWith(404)).to.be.true;
        expect(jsonStub.calledWith({ statusCode: 404, message: 'Not Found' }))
          .to.be.true;
      });

      it('should not answer again if the filter has answered', () => {
        sinon.stub(adapter, 'isHeadersSent').returns(true);
        handler.setCustomFilters([
          { exceptionMetatypes: [], func: () => of(null) },
        ]);
        handler.next(
          new HttpException('Not Found', 404),
          new ExecutionContextHost([0, response]),
        );

        expect(statusStub.called).to.be.false;
        expect(jsonStub.called).to.be.false;
      });
    });
    // What a GraphQL exception filter does when it is bound globally, and so
    // to the HTTP routes as well
    describe('when a custom filter returns the exception', () => {
      it('should answer as if no filter had matched', () => {
        handler.setCustomFilters([
          { exceptionMetatypes: [], func: (exception: unknown) => exception },
        ]);
        handler.next(
          new HttpException('Not Found', 404),
          new ExecutionContextHost([0, response]),
        );

        expect(statusStub.calledWith(404)).to.be.true;
        expect(jsonStub.calledWith({ statusCode: 404, message: 'Not Found' }))
          .to.be.true;
      });

      it('should not answer again if the filter has answered', () => {
        sinon.stub(adapter, 'isHeadersSent').returns(true);
        handler.setCustomFilters([
          { exceptionMetatypes: [], func: (exception: unknown) => exception },
        ]);
        handler.next(
          new HttpException('Not Found', 404),
          new ExecutionContextHost([0, response]),
        );

        expect(statusStub.called).to.be.false;
        expect(jsonStub.called).to.be.false;
      });
    });
    describe('when a custom filter returns something else', () => {
      // e.g. "return response.status(404).json(...)", or "return
      // stream.pipe(response)" that answers a little later
      (
        [
          ['the response', () => response],
          ['a stream', () => new PassThrough()],
          ['a value', () => true],
          // e.g. a Fastify reply, which is a thenable
          ['a thenable', () => ({ then: sinon.spy() })],
        ] as Array<[string, () => any]>
      ).forEach(([name, getResult]) => {
        it(`should leave the request to the filter (${name})`, () => {
          const result = getResult();
          handler.setCustomFilters([
            { exceptionMetatypes: [], func: () => result },
          ]);
          handler.next(
            new HttpException('Not Found', 404),
            new ExecutionContextHost([0, response]),
          );

          expect(statusStub.called).to.be.false;
          expect(jsonStub.called).to.be.false;
          if (typeof result?.then === 'function') {
            expect(result.then.called).to.be.false;
          }
        });
      });
    });
    describe('when a custom filter is async', () => {
      const settled = () => new Promise(resolve => setImmediate(resolve));
      const next = () =>
        handler.next(
          new HttpException('Not Found', 404),
          new ExecutionContextHost([0, response]),
        );

      // What an async RPC exception filter does in a hybrid application
      (
        [
          ['a stream', () => throwError(() => ({ code: 2 }))],
          ['the exception', (exception: unknown) => exception],
        ] as Array<[string, (exception: unknown) => unknown]>
      ).forEach(([name, getResult]) => {
        it(`should answer once it resolves to ${name}, as if no filter had matched`, async () => {
          handler.setCustomFilters([
            {
              exceptionMetatypes: [],
              func: async (exception: unknown) => getResult(exception),
            },
          ]);
          next();
          expect(statusStub.called).to.be.false;
          await settled();

          expect(statusStub.calledOnce).to.be.true;
          expect(statusStub.calledWith(404)).to.be.true;
          expect(jsonStub.calledWith({ statusCode: 404, message: 'Not Found' }))
            .to.be.true;
        });
      });

      it('should not answer if the response was sent before it resolved', async () => {
        let headersSent = false;
        sinon.stub(adapter, 'isHeadersSent').callsFake(() => headersSent);
        handler.setCustomFilters([
          {
            exceptionMetatypes: [],
            func: async () => {
              headersSent = true;
              return of(null);
            },
          },
        ]);
        next();
        await settled();

        expect(statusStub.called).to.be.false;
        expect(jsonStub.called).to.be.false;
      });

      it('should leave the request to a filter that resolves to nothing', async () => {
        handler.setCustomFilters([
          { exceptionMetatypes: [], func: async () => undefined },
        ]);
        next();
        await settled();

        expect(statusStub.called).to.be.false;
        expect(jsonStub.called).to.be.false;
      });

      it('should leave the rejection of a filter as it is', () => {
        // Only its fulfilment is handled, so it is reported as before
        class ObservedPromise<T> extends Promise<T> {
          static readonly handlers: unknown[][] = [];
          then(...handlers: any[]): any {
            ObservedPromise.handlers.push(handlers);
            return (super.then as any)(...handlers);
          }
        }
        handler.setCustomFilters([
          {
            exceptionMetatypes: [],
            func: () => ObservedPromise.resolve(undefined),
          },
        ]);
        next();

        expect(ObservedPromise.handlers[0]).to.have.lengthOf(1);
        expect(ObservedPromise.handlers[0][0]).to.be.a('function');
      });

      it('should answer with a server error if the default answer fails', async () => {
        const replyError = new TypeError('Do not know how to serialize');
        (adapter.reply as sinon.SinonStub).onFirstCall().throws(replyError);
        const logger = sinon.stub((ExceptionsHandler as any).logger, 'error');
        handler.setCustomFilters([
          { exceptionMetatypes: [], func: async () => of(null) },
        ]);
        next();
        await settled();

        expect(statusStub.calledWith(500)).to.be.true;
        expect(
          jsonStub.calledWith({
            statusCode: 500,
            message: 'Internal server error',
          }),
        ).to.be.true;
        expect(logger.calledWith(replyError)).to.be.true;
      });
    });
    describe('when "invokeCustomFilters" returns true', () => {
      beforeEach(() => {
        sinon.stub(handler, 'invokeCustomFilters').returns(true);
      });
      it('should do nothing', () => {
        handler.next(
          new Error(),
          sinon.createStubInstance(ExecutionContextHost),
        );

        expect(statusStub.notCalled).to.be.true;
        expect(jsonStub.notCalled).to.be.true;
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
      expect(() => handler.setCustomFilters(null!)).to.throws(
        InvalidExceptionFilterException,
      );
    });
  });
  describe('invokeCustomFilters', () => {
    describe('when filters array is empty', () => {
      it('should return false', () => {
        expect(handler.invokeCustomFilters(null, null!)).to.be.false;
      });
    });
    describe('when filters array is not empty', () => {
      let filters, funcSpy;
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
