import {
  HttpException,
  InternalServerErrorException,
} from '../../exceptions/index.js';

describe('InternalServerErrorException', () => {
  it('should return 500 as status code', () => {
    const exc = new InternalServerErrorException();
    expect(exc.getStatus()).toBe(500);
  });

  it('should return "Internal Server Error" as default message', () => {
    const exc = new InternalServerErrorException();
    expect(exc.getResponse()).toEqual({
      message: 'Internal Server Error',
      statusCode: 500,
    });
  });

  it('should accept a custom message', () => {
    const exc = new InternalServerErrorException('Custom error');
    expect(exc.getResponse()).toEqual({
      message: 'Custom error',
      error: 'Internal Server Error',
      statusCode: 500,
    });
  });

  it('should accept a custom object', () => {
    const exc = new InternalServerErrorException({ foo: 'bar' });
    expect(exc.getResponse()).toEqual({ foo: 'bar' });
  });

  it('should accept a cause option', () => {
    const cause = new Error('root cause');
    const exc = new InternalServerErrorException('test', { cause });
    expect(exc.cause).toBe(cause);
  });

  it('should extend HttpException', () => {
    const exc = new InternalServerErrorException();
    expect(exc).toBeInstanceOf(HttpException);
    expect(exc).toBeInstanceOf(Error);
  });
});
