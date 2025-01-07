/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { expect } from 'chai';
import { Type } from '../../../common';
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
} from '../../exceptions';

describe('HttpException', () => {
  describe('getResponse', () => {
    it('should return a response as a string when input is a string', () => {
      const message = 'My error message';
      expect(new HttpException(message, 404).getResponse()).to.be.eql(
        'My error message',
      );
    });

    it('should return a response as an object when input is an object', () => {
      const message = {
        msg: 'My error message',
        reason: 'this can be a human readable reason',
        anything: 'else',
      };
      expect(new HttpException(message, 404).getResponse()).to.be.eql(message);
    });

    it('should return a message from a built-in exception as an object', () => {
      const message = 'My error message';
      expect(new BadRequestException(message).getResponse()).to.be.eql({
        statusCode: 400,
        error: 'Bad Request',
        message: 'My error message',
      });
    });

    it('should return an object even when the message is undefined', () => {
      expect(new BadRequestException().getResponse()).to.be.eql({
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
          expect(new ExceptionClass().getStatus()).to.be.eql(expectedStatus);
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
            expect(new ExceptionClass().getResponse()).to.be.eql({
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

        expect(badRequestError.getResponse()).to.be.eql({
          message: 'ErrorMessage',
          error: 'Some error description',
          statusCode: 400,
        });
      });
    });
  });

  it('should inherit from error', () => {
    const error = new HttpException('', 400);
    expect(error instanceof Error).to.be.true;
  });

  describe('when serializing', () => {
    describe('and "response" parameter is a string', () => {
      it('should concatenate HttpException with the given message', () => {
        const responseAsString = 'Some Error';
        const error = new HttpException(responseAsString, 400);
        expect(`${error}`).to.be.eql(`HttpException: ${responseAsString}`);
        expect(`${error}`.includes('[object Object]')).to.not.be.true;
      });
    });

    describe('and "response" parameter is an object', () => {
      it('should use default message', () => {
        const responseAsObject = { foo: 'bar' };
        const error = new HttpException(responseAsObject, 400);
        const badRequestError = new BadRequestException(responseAsObject);

        expect(`${error}`).to.be.eql(`HttpException: Http Exception`);
        expect(`${badRequestError}`).to.be.eql(
          `BadRequestException: Bad Request Exception`,
        );
        expect(`${error}`.includes('[object Object]')).to.not.be.true;
        expect(`${badRequestError}`.includes('[object Object]')).to.not.be.true;
      });
    });
  });

  describe('createBody', () => {
    describe('when object has been passed', () => {
      it('should return expected object', () => {
        const object = {
          message: 'test',
        };
        expect(HttpException.createBody(object)).to.be.eql(object);
      });
    });
    describe('when string has been passed', () => {
      it('should return expected object', () => {
        const error = 'test';
        const status = 500;
        const message = 'error';
        expect(HttpException.createBody(message, error, status)).to.be.eql({
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
        expect(HttpException.createBody(null, error, status)).to.be.eql({
          message: error,
          statusCode: status,
        });
      });
    });
    it('should not override pre-defined body if message is array', () => {
      expect(
        HttpException.createBody(['a', 'random', 'array'], 'error', 200),
      ).to.eql({
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

      expect(`${error}`).to.be.eql(`HttpException: ${customDescription}`);
      const { cause } = error;

      expect(cause).to.be.eql(errorCause);
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

        expect(cause).to.be.eql(errorCause);
      });
    });
  });
});
