import {
  BadRequestException,
  HttpException,
  NotFoundException,
} from '../../exceptions';

describe('HttpException', () => {
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

  it('should return a status code', () => {
    expect(new BadRequestException().getStatus()).toEqual(400);
    expect(new NotFoundException().getStatus()).toEqual(404);
  });

  it('should return a response', () => {
    expect(new BadRequestException().getResponse()).toEqual({
      message: 'Bad Request',
      statusCode: 400,
    });
    expect(new NotFoundException().getResponse()).toEqual({
      message: 'Not Found',
      statusCode: 404,
    });
  });

  it('should inherit from error', () => {
    const error = new HttpException('', 400);
    expect(error instanceof Error).toBeTruthy();
  });

  it('should be serializable', () => {
    const message = 'Some Error';
    const error = new HttpException(message, 400);
    expect(`${error}`).toEqual(`HttpException: ${message}`);
  });

  describe('when "response" is an object', () => {
    it('should use default message', () => {
      const obj = { foo: 'bar' };
      const error = new HttpException(obj, 400);
      const badRequestError = new BadRequestException(obj);

      expect(`${error}`).toEqual(`HttpException: Http Exception`);
      expect(`${badRequestError}`).toEqual(
        `BadRequestException: Bad Request Exception`,
      );
      expect(`${error}`.includes('[object Object]')).to.not.be.true;
      expect(`${badRequestError}`.includes('[object Object]')).to.not.be.true;
    });
    describe('otherwise', () => {
      it('should concat strings', () => {
        const test = 'test message';
        const error = new HttpException(test, 400);
        expect(`${error}`).toEqual(`HttpException: ${test}`);
        expect(`${error}`.includes('[object Object]')).to.not.be.true;
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
});
