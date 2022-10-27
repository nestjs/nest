import { expect } from 'chai';
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
        expect(new BadRequestException().getStatus()).to.be.eql(400);
        expect(new NotFoundException().getStatus()).to.be.eql(404);
      });
    });

    describe('getResponse', () => {
      it('should return a response with default message and status code', () => {
        expect(new BadRequestException().getResponse()).to.be.eql({
          message: 'Bad Request',
          statusCode: 400,
        });
        expect(new NotFoundException().getResponse()).to.be.eql({
          message: 'Not Found',
          statusCode: 404,
        });
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

    it('configures a cause when message is an instance of error', () => {
      const message = new Error('Some Error');
      const error = new HttpException(message, 400);
      expect(`${error}`).to.be.eql(`HttpException: ${message.message}`);
      const { cause } = error;

      expect(cause).to.be.eql(message);
    });

    it('configures a cause when message is a string and the options object is passed', () => {
      const causeError = new Error('Some Error');

      const customDescription = 'custom description';
      const error = new HttpException(customDescription, 400, {
        cause: causeError,
      });

      expect(`${error}`).to.be.eql(`HttpException: ${customDescription}`);
      const { cause } = error;

      expect(cause).to.be.eql(causeError);
    });

    it('configures a cause when using a bult-in exception with options', () => {
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
