import { HttpException, BadRequestException } from '../../exceptions/index.js';

describe('BadRequestException', () => {
  it('should return 400 as status code', () => {
    const exc = new BadRequestException();
    expect(exc.getStatus()).toBe(400);
  });

  it('should return "Bad Request" as default message', () => {
    const exc = new BadRequestException();
    expect(exc.getResponse()).toEqual({
      message: 'Bad Request',
      statusCode: 400,
    });
  });

  it('should accept a custom message', () => {
    const exc = new BadRequestException('Custom error');
    expect(exc.getResponse()).toEqual({
      message: 'Custom error',
      error: 'Bad Request',
      statusCode: 400,
    });
  });

  it('should accept a custom object', () => {
    const exc = new BadRequestException({ foo: 'bar' });
    expect(exc.getResponse()).toEqual({ foo: 'bar' });
  });

  it('should accept a cause option', () => {
    const cause = new Error('root cause');
    const exc = new BadRequestException('test', { cause });
    expect(exc.cause).toBe(cause);
  });

  it('should extend HttpException', () => {
    const exc = new BadRequestException();
    expect(exc).toBeInstanceOf(HttpException);
    expect(exc).toBeInstanceOf(Error);
  });
});
