import { HttpException } from '@nestjs/common';
import { isNil, isObject } from '@nestjs/common/utils/shared.utils.js';
import createHttpError from 'http-errors';
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
    it('should not treat errors from external API calls as errors from "http-errors" library', () => {
      const apiCallError = Object.assign(
        new Error('Some external API call failed'),
        { status: 400 },
      );
      handler.next(apiCallError, new ExecutionContextHost([0, response]));

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
    it('should not treat errors from external API calls as errors from "http-errors" library', () => {
      const apiCallError = Object.assign(
        new Error('Some external API call failed'),
        { status: 400 },
      );
      handler.next(apiCallError, new ExecutionContextHost([0, response]));

      expect(statusStub).toHaveBeenCalledWith(500);
      expect(jsonStub).toHaveBeenCalledWith({
        statusCode: 500,
        message: 'Internal server error',
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
