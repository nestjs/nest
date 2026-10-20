import { HttpException } from '@nestjs/common';
import { isNil, isObject } from '@nestjs/common/utils/shared.utils.js';
import createHttpError from 'http-errors';
import { of, throwError } from 'rxjs';
import { AbstractHttpAdapter } from '../../adapters/index.js';
import { InvalidExceptionFilterException } from '../../errors/exceptions/invalid-exception-filter.exception.js';
import { ExceptionsHandler } from '../../exceptions/exceptions-handler.js';
import { ExecutionContextHost } from '../../helpers/execution-context-host.js';
import { NoopHttpAdapter } from '../utils/noop-adapter.js';
import fastifyErrors from '@fastify/error';

describe('ExceptionsHandler', () => {
  let adapter: AbstractHttpAdapter;
  let handler: ExceptionsHandler;
  let statusStub: ReturnType<typeof vi.fn>;
  let jsonStub: ReturnType<typeof vi.fn>;
  let response: any;

  beforeEach(() => {
    adapter = new NoopHttpAdapter({});
    handler = new ExceptionsHandler(adapter);
    statusStub = vi.fn();
    jsonStub = vi.fn();

    response = {
      status: statusStub,
      json: jsonStub,
    };
    response.status.mockReturnValue(response);
    response.json.mockReturnValue(response);
  });

  describe('next', () => {
    beforeEach(() => {
      vi.spyOn(adapter, 'reply').mockImplementation(
        (responseRef: any, body: any, statusCode?: number) => {
          if (statusCode) {
            responseRef.status(statusCode);
          }
          if (isNil(body)) {
            return responseRef.send();
          }
          return isObject(body)
            ? responseRef.json(body)
            : responseRef.send(String(body));
        },
      );
    });
    it('should send expected response status code and message when exception is unknown', () => {
      handler.next(new Error(), new ExecutionContextHost([0, response]));

      expect(statusStub).toHaveBeenCalledWith(500);
      expect(jsonStub).toHaveBeenCalledWith({
        statusCode: 500,
        message: 'Internal server error',
      });
    });
    it('should treat fastify errors as http errors', () => {
      const fastifyError = fastifyErrors.createError(
        'FST_ERR_CTP_EMPTY_JSON_BODY',
        "Body cannot be empty when content-type is set to 'application/json'",
        400,
      )();
      handler.next(fastifyError, new ExecutionContextHost([0, response]));

      expect(statusStub).toHaveBeenCalledWith(400);
      expect(jsonStub).toHaveBeenCalledWith({
        statusCode: 400,
        message:
          "Body cannot be empty when content-type is set to 'application/json'",
      });
    });
    it('should treat fastify validation errors as http errors', () => {
      const validationError = Object.assign(
        new Error("body must have required property 'name'"),
        { statusCode: 400, code: 'FST_ERR_VALIDATION', validation: [] },
      );
      handler.next(validationError, new ExecutionContextHost([0, response]));

      expect(statusStub).toHaveBeenCalledWith(400);
      expect(jsonStub).toHaveBeenCalledWith({
        statusCode: 400,
        message: "body must have required property 'name'",
      });
    });
    it('should not treat errors from external API calls with statusCode as http errors', () => {
      const apiCallError = Object.assign(
        new Error('Some external API call failed'),
        { statusCode: 400 },
      );
      handler.next(apiCallError, new ExecutionContextHost([0, response]));

      expect(statusStub).toHaveBeenCalledWith(500);
      expect(jsonStub).toHaveBeenCalledWith({
        statusCode: 500,
        message: 'Internal server error',
      });
    });
    it('should treat plain http-error shaped objects as http errors', () => {
      const plainHttpError = {
        statusCode: 400,
        message: 'Invalid middleware payload',
      };
      handler.next(plainHttpError, new ExecutionContextHost([0, response]));

      expect(statusStub).toHaveBeenCalledWith(400);
      expect(jsonStub).toHaveBeenCalledWith({
        statusCode: 400,
        message: 'Invalid middleware payload',
      });
    });
    it('should not treat plain objects with non-4xx/5xx status codes as http errors', () => {
      const plainObject = {
        statusCode: 200,
        message: 'Success payload',
      };
      handler.next(plainObject, new ExecutionContextHost([0, response]));

      expect(statusStub).toHaveBeenCalledWith(500);
      expect(jsonStub).toHaveBeenCalledWith({
        statusCode: 500,
        message: 'Internal server error',
      });
    });
    it('should treat plain http-error shaped objects with the highest 5xx status code as http errors', () => {
      const plainHttpError = {
        statusCode: 599,
        message: 'Upstream failure',
      };
      handler.next(plainHttpError, new ExecutionContextHost([0, response]));
      expect(statusStub).toHaveBeenCalledWith(599);
      expect(jsonStub).toHaveBeenCalledWith({
        statusCode: 599,
        message: 'Upstream failure',
      });
    });
    [
      { statusCode: 600, message: 'Status code above 5xx' },
      { statusCode: 400.5, message: 'Non-integer status code' },
      { statusCode: 400, message: '' },
      null,
      'Some thrown string',
    ].forEach(value => {
      it(`should not treat ${JSON.stringify(value)} as an http error`, () => {
        handler.next(value, new ExecutionContextHost([0, response]));
        expect(statusStub).toHaveBeenCalledWith(500);
        expect(jsonStub).toHaveBeenCalledWith({
          statusCode: 500,
          message: 'Internal server error',
        });
      });
    });
    describe('when exception is instantiated by "http-errors" library', () => {
      it('should send expected response status code and message', () => {
        const error = new createHttpError.NotFound('User does not exist');
        handler.next(error, new ExecutionContextHost([0, response]));

        expect(statusStub).toHaveBeenCalledWith(404);
        expect(jsonStub).toHaveBeenCalledWith({
          statusCode: 404,
          message: 'User does not exist',
        });
      });
      it('should not send the message of an error that must not be exposed', () => {
        // What "send" (res.sendFile(), express.static()) passes to next()
        const error = createHttpError(
          404,
          new Error("ENOENT: no such file or directory, stat '/srv/files/a'"),
          { expose: false },
        );
        handler.next(error, new ExecutionContextHost([0, response]));

        expect(statusStub).toHaveBeenCalledWith(404);
        expect(jsonStub).toHaveBeenCalledWith({
          statusCode: 404,
          message: 'Not Found',
        });
      });
      it('should not send the message of a 5xx error by default', () => {
        const error = new createHttpError.BadGateway('connect 10.0.0.1:5432');
        handler.next(error, new ExecutionContextHost([0, response]));

        expect(statusStub).toHaveBeenCalledWith(502);
        expect(jsonStub).toHaveBeenCalledWith({
          statusCode: 502,
          message: 'Bad Gateway',
        });
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

        expect(statusStub).toHaveBeenCalledWith(status);
        expect(jsonStub).toHaveBeenCalledWith(message);
      });
      it('should send expected response status code and transform message to json', () => {
        const status = 401;
        const message = 'Unauthorized';

        handler.next(
          new HttpException(message, status),
          new ExecutionContextHost([0, response]),
        );

        expect(statusStub).toHaveBeenCalledWith(status);
        expect(jsonStub).toHaveBeenCalledWith({ message, statusCode: status });
      });
      it('should preserve errorCode in the response body when the response is a string', () => {
        const status = 403;
        const message = 'Forbidden';

        handler.next(
          new HttpException(message, status, { errorCode: 'FORBIDDEN_ERR' }),
          new ExecutionContextHost([0, response]),
        );

        expect(statusStub).toHaveBeenCalledWith(status);
        expect(jsonStub).toHaveBeenCalledWith({
          statusCode: status,
          message,
          errorCode: 'FORBIDDEN_ERR',
        });
      });
      it('should not add errorCode to the response body when it is not set', () => {
        const status = 403;
        const message = 'Forbidden';

        handler.next(
          new HttpException(message, status),
          new ExecutionContextHost([0, response]),
        );

        expect(statusStub).toHaveBeenCalledWith(status);
        expect(jsonStub).toHaveBeenCalledWith({
          statusCode: status,
          message,
        });
      });
    });
    describe('when "invokeCustomFilters" returns true', () => {
      beforeEach(() => {
        vi.spyOn(handler, 'invokeCustomFilters').mockReturnValue(true);
      });
      it('should do nothing', () => {
        handler.next(new Error(), {
          ...Object.fromEntries(
            Object.getOwnPropertyNames(ExecutionContextHost.prototype).map(
              m => [m, vi.fn()],
            ),
          ),
        } as any);

        expect(statusStub).not.toHaveBeenCalled();
        expect(jsonStub).not.toHaveBeenCalled();
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

        expect(statusStub).toHaveBeenCalledWith(404);
        expect(jsonStub).toHaveBeenCalledWith({
          statusCode: 404,
          message: 'Not Found',
        });
      });

      it('should not answer again if the filter has answered', () => {
        vi.spyOn(adapter, 'isHeadersSent').mockReturnValue(true);
        handler.setCustomFilters([
          { exceptionMetatypes: [], func: () => of(null) },
        ]);
        handler.next(
          new HttpException('Not Found', 404),
          new ExecutionContextHost([0, response]),
        );

        expect(statusStub).not.toHaveBeenCalled();
        expect(jsonStub).not.toHaveBeenCalled();
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
      expect(() => handler.setCustomFilters(null!)).toThrow(
        InvalidExceptionFilterException,
      );
    });
  });
  describe('invokeCustomFilters', () => {
    describe('when filters array is empty', () => {
      it('should return false', () => {
        expect(handler.invokeCustomFilters(null, null!)).toBe(false);
      });
    });
    describe('when filters array is not empty', () => {
      let filters, funcSpy;
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
