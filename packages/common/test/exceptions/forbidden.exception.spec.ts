import { HttpException, ForbiddenException } from '../../exceptions/index.js';

describe('ForbiddenException', () => {
  it('should return 403 as status code', () => {
    const exc = new ForbiddenException();
    expect(exc.getStatus()).toBe(403);
  });

  it('should return "Forbidden" as default message', () => {
    const exc = new ForbiddenException();
    expect(exc.getResponse()).toEqual({
      message: 'Forbidden',
      statusCode: 403,
    });
  });

  it('should accept a custom message', () => {
    const exc = new ForbiddenException('Custom error');
    expect(exc.getResponse()).toEqual({
      message: 'Custom error',
      error: 'Forbidden',
      statusCode: 403,
    });
  });

  it('should accept a custom object', () => {
    const exc = new ForbiddenException({ foo: 'bar' });
    expect(exc.getResponse()).toEqual({ foo: 'bar' });
  });

  it('should accept a cause option', () => {
    const cause = new Error('root cause');
    const exc = new ForbiddenException('test', { cause });
    expect(exc.cause).toBe(cause);
  });

  it('should extend HttpException', () => {
    const exc = new ForbiddenException();
    expect(exc).toBeInstanceOf(HttpException);
    expect(exc).toBeInstanceOf(Error);
  });
});
