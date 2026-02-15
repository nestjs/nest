import { Type } from '../../../common/index.js';
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GatewayTimeoutException,
  GoneException,
  HttpException,
  HttpVersionNotSupportedException,
  ImATeapotException,
  InternalServerErrorException,
  MethodNotAllowedException,
  MisdirectedException,
  NotAcceptableException,
  NotFoundException,
  NotImplementedException,
  PayloadTooLargeException,
  PreconditionFailedException,
  RequestTimeoutException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
  UnsupportedMediaTypeException,
} from '../../exceptions/index.js';
import { HttpStatus } from '@nestjs/common';

describe('HttpException', () => {
  describe('getResponse', () => {
    it('should return a response as a string when input is a string', () => {
      const message = 'My error message';
      expect(new HttpException(message, 404).getResponse()).toEqual(
        'My error message',
      );
    });

    it('should return a response as an object when input is an object', () => {
      const message = {
        msg: 'My error message',
        reason: 'this can be a human readable reason',
        anything: 'else',
      };
      expect(new HttpException(message, 404).getResponse()).toEqual(message);
    });

    it('should return a message from a built-in exception as an object', () => {
      const message = 'My error message';
      expect(new BadRequestException(message).getResponse()).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'My error message',
      });
    });

    it('should return an object even when the message is undefined', () => {
      expect(new BadRequestException().getResponse()).toEqual({
        statusCode: 400,
        message: 'Bad Request',
      });
    });
  });

  describe('built-in exceptions', () => {
    describe('getStatus', () => {
      it('should return given status code', () => {
        const testCases: [Type<HttpException>, number][] = [
          [BadRequestException, 400],
          [UnauthorizedException, 401],
          [ForbiddenException, 403],
          [NotFoundException, 404],
          [MethodNotAllowedException, 405],
          [NotAcceptableException, 406],
          [RequestTimeoutException, 408],
          [ConflictException, 409],
          [GoneException, 410],
          [PreconditionFailedException, 412],
          [PayloadTooLargeException, 413],
          [UnsupportedMediaTypeException, 415],
          [ImATeapotException, 418],
          [MisdirectedException, 421],
          [UnprocessableEntityException, 422],
          [InternalServerErrorException, 500],
          [NotImplementedException, 501],
          [BadGatewayException, 502],
          [ServiceUnavailableException, 503],
          [GatewayTimeoutException, 504],
          [HttpVersionNotSupportedException, 505],
        ];

        testCases.forEach(([ExceptionClass, expectedStatus]) => {
          expect(new ExceptionClass().getStatus()).toEqual(expectedStatus);
        });
      });
    });

    describe('getResponse', () => {
      it('should return a response with default message and status code', () => {
        const testCases: [Type<HttpException>, number, string][] = [
          [BadRequestException, 400, 'Bad Request'],
          [UnauthorizedException, 401, 'Unauthorized'],
          [ForbiddenException, 403, 'Forbidden'],
          [NotFoundException, 404, 'Not Found'],
          [MethodNotAllowedException, 405, 'Method Not Allowed'],
          [NotAcceptableException, 406, 'Not Acceptable'],
          [RequestTimeoutException, 408, 'Request Timeout'],
          [ConflictException, 409, 'Conflict'],
          [GoneException, 410, 'Gone'],
          [PreconditionFailedException, 412, 'Precondition Failed'],
          [PayloadTooLargeException, 413, 'Payload Too Large'],
          [UnsupportedMediaTypeException, 415, 'Unsupported Media Type'],
          [ImATeapotException, 418, "I'm a teapot"],
          [MisdirectedException, 421, 'Misdirected'],
          [UnprocessableEntityException, 422, 'Unprocessable Entity'],
          [InternalServerErrorException, 500, 'Internal Server Error'],
          [NotImplementedException, 501, 'Not Implemented'],
          [BadGatewayException, 502, 'Bad Gateway'],
          [ServiceUnavailableException, 503, 'Service Unavailable'],
          [GatewayTimeoutException, 504, 'Gateway Timeout'],
          [HttpVersionNotSupportedException, 505, 'HTTP Version Not Supported'],
        ];

        testCases.forEach(
          ([ExceptionClass, expectedStatus, expectedMessage]) => {
            expect(new ExceptionClass().getResponse()).toEqual({
              message: expectedMessage,
              statusCode: expectedStatus,
            });
          },
        );
      });

      it('should return a response with an "error" attribute when description was provided as the "option" object', () => {
        const badRequestError = new BadRequestException('ErrorMessage', {
          description: 'Some error description',
        });

        expect(badRequestError.getResponse()).toEqual({
          message: 'ErrorMessage',
          error: 'Some error description',
          statusCode: 400,
        });
      });
    });
  });

  it('should inherit from error', () => {
    const error = new HttpException('', 400);
    expect(error instanceof Error).toBe(true);
  });

  describe('when serializing', () => {
    describe('and "response" parameter is a string', () => {
      it('should concatenate HttpException with the given message', () => {
        const responseAsString = 'Some Error';
        const error = new HttpException(responseAsString, 400);
        expect(`${error}`).toEqual(`HttpException: ${responseAsString}`);
        expect(`${error}`.includes('[object Object]')).not.toBe(true);
      });
    });

    describe('and "response" parameter is an object', () => {
      it('should use default message', () => {
        const responseAsObject = { foo: 'bar' };
        const error = new HttpException(responseAsObject, 400);
        const badRequestError = new BadRequestException(responseAsObject);

        expect(`${error}`).toEqual(`HttpException: Http Exception`);
        expect(`${badRequestError}`).toEqual(
          `BadRequestException: Bad Request Exception`,
        );
        expect(`${error}`.includes('[object Object]')).not.toBe(true);
        expect(`${badRequestError}`.includes('[object Object]')).not.toBe(true);
      });
    });
  });

  describe('createBody', () => {
    describe('when object has been passed', () => {
      it('should return expected object', () => {
        const object = {
          message: 'test',
        };
        expect(HttpException.createBody(object)).toEqual(object);
      });
    });
    describe('when string has been passed', () => {
      it('should return expected object', () => {
        const error = 'test';
        const status = 500;
        const message = 'error';
        expect(HttpException.createBody(message, error, status)).toEqual({
          error,
          message,
          statusCode: status,
        });
      });
    });
    describe('when nil has been passed', () => {
      it('should return expected object', () => {
        const status = 500;
        const error = 'error';
        expect(HttpException.createBody(null, error, status)).toEqual({
          message: error,
          statusCode: status,
        });
      });
    });
    it('should not override pre-defined body if message is array', () => {
      expect(
        HttpException.createBody(['a', 'random', 'array'], 'error', 200),
      ).toEqual({
        message: ['a', 'random', 'array'],
        error: 'error',
        statusCode: 200,
      });
    });
  });

  describe('initCause', () => {
    const errorCause = new Error('An internal error cause');
    const customDescription = 'custom description';

    it('configures a cause when message is a string and the options object is passed', () => {
      const error = new HttpException(customDescription, 400, {
        cause: errorCause,
      });

      expect(`${error}`).toEqual(`HttpException: ${customDescription}`);
      const { cause } = error;

      expect(cause).toEqual(errorCause);
    });

    it('configures a cause when using a built-in exception with options', () => {
      const builtInErrorClasses = [
        BadGatewayException,
        BadRequestException,
        ConflictException,
        ForbiddenException,
        GatewayTimeoutException,
        GoneException,
        HttpVersionNotSupportedException,
        ImATeapotException,
        InternalServerErrorException,
        MethodNotAllowedException,
        MisdirectedException,
        NotAcceptableException,
        NotFoundException,
        NotImplementedException,
        PayloadTooLargeException,
        PreconditionFailedException,
        RequestTimeoutException,
        ServiceUnavailableException,
        UnauthorizedException,
        UnprocessableEntityException,
        UnsupportedMediaTypeException,
      ];

      builtInErrorClasses.forEach(ExceptionClass => {
        const error = new ExceptionClass(customDescription, {
          cause: errorCause,
        });

        const { cause } = error;

        expect(cause).toEqual(errorCause);
      });
    });

    it('should not set cause when options has no cause', () => {
      const error = new HttpException('test', 400, {});
      expect(error.cause).toBeUndefined();
    });

    it('should not set cause when no options provided', () => {
      const error = new HttpException('test', 400);
      expect(error.cause).toBeUndefined();
    });
  });

  describe('initMessage', () => {
    it('should use response.message when response is an object with a message string', () => {
      const error = new HttpException({ message: 'custom message' }, 400);
      expect(error.message).toBe('custom message');
    });

    it('should fall back to constructor name when response is an object without message', () => {
      const error = new HttpException({ foo: 'bar' }, 400);
      expect(error.message).toBe('Http Exception');
    });
  });

  describe('initName', () => {
    it('should set the name to the constructor name', () => {
      const error = new HttpException('msg', 400);
      expect(error.name).toBe('HttpException');
    });

    it('should set name based on subclass', () => {
      const error = new BadRequestException('msg');
      expect(error.name).toBe('BadRequestException');
    });
  });

  describe('static helpers', () => {
    describe('getDescriptionFrom', () => {
      it('should return the string when a string is passed', () => {
        expect(HttpException.getDescriptionFrom('desc')).toBe('desc');
      });

      it('should return the description property when an options object is passed', () => {
        expect(
          HttpException.getDescriptionFrom({ description: 'from-options' }),
        ).toBe('from-options');
      });

      it('should return undefined when options has no description', () => {
        expect(HttpException.getDescriptionFrom({})).toBeUndefined();
      });
    });

    describe('getHttpExceptionOptionsFrom', () => {
      it('should return empty object when a string is passed', () => {
        expect(HttpException.getHttpExceptionOptionsFrom('desc')).toEqual({});
      });

      it('should return the options object as-is', () => {
        const options = { cause: new Error('cause'), description: 'desc' };
        expect(HttpException.getHttpExceptionOptionsFrom(options)).toBe(
          options,
        );
      });
    });

    describe('extractDescriptionAndOptionsFrom', () => {
      it('should extract description string and return empty options', () => {
        const result =
          HttpException.extractDescriptionAndOptionsFrom('my description');
        expect(result.description).toBe('my description');
        expect(result.httpExceptionOptions).toEqual({});
      });

      it('should extract description from options object', () => {
        const opts = { description: 'from obj', cause: new Error() };
        const result = HttpException.extractDescriptionAndOptionsFrom(opts);
        expect(result.description).toBe('from obj');
        expect(result.httpExceptionOptions).toBe(opts);
      });
    });

    describe('createBody with number message', () => {
      it('should handle a number as the message', () => {
        expect(HttpException.createBody(404, 'Not Found', 404)).toEqual({
          message: 404,
          error: 'Not Found',
          statusCode: 404,
        });
      });
    });

    describe('createBody with empty string', () => {
      it('should treat empty string as nil', () => {
        expect(HttpException.createBody('', 'Error', 500)).toEqual({
          message: 'Error',
          statusCode: 500,
        });
      });
    });
  });

  describe('when exception is created with a string and a description', () => {
    it('should return a response with a message, error and status code', () => {
      const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      expect(exception.getResponse()).to.deep.equal('Forbidden');
    });

    it('should return a response with a message, error, status code and description', () => {
      const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN, {
        description: 'some description',
      });
      expect(exception.getResponse()).to.deep.equal('Forbidden');
    });
  });

  describe('when exception is created with a string and a cause', () => {
    it('should set a cause', () => {
      const error = new Error('An internal error cause');
      const exception = new HttpException(
        'Bad request',
        HttpStatus.BAD_REQUEST,
        { cause: error },
      );
      expect(exception.cause).to.equal(error);
    });
  });

  describe('when exception is created with an errorCode', () => {
    it('should set an errorCode', () => {
      const exception = new HttpException(
        'Bad request',
        HttpStatus.BAD_REQUEST,
        {
          errorCode: 'BAD_REQUEST_CODE',
        },
      );
      expect(exception.errorCode).to.equal('BAD_REQUEST_CODE');
    });

    it('should be included in the response body when createBody is called', () => {
      const body = HttpException.createBody(
        'Bad Request',
        'Error',
        400,
        'BAD_REQUEST_CODE',
      );
      expect(body.errorCode).to.equal('BAD_REQUEST_CODE');
    });
  });

  describe('when exception is thrown', () => {
    it('should return a response with a status code and a message', () => {
      const exception = new BadRequestException('error');
      const response = exception.getResponse();
      const message = {
        statusCode: 400,
        error: 'Bad Request',
        message: 'error',
      };
      expect(message).to.deep.equal(response);
    });
  });
});
