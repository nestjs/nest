import {
  HttpException,
  MethodNotAllowedException,
} from '../../exceptions/index.js';

describe('MethodNotAllowedException', () => {
  it('should return 405 as status code', () => {
    const exc = new MethodNotAllowedException();
    expect(exc.getStatus()).toBe(405);
  });

  it('should return "Method Not Allowed" as default message', () => {
    const exc = new MethodNotAllowedException();
    expect(exc.getResponse()).toEqual({
      message: 'Method Not Allowed',
      statusCode: 405,
    });
  });

  it('should accept a custom message', () => {
    const exc = new MethodNotAllowedException('Custom error');
    expect(exc.getResponse()).toEqual({
      message: 'Custom error',
      error: 'Method Not Allowed',
      statusCode: 405,
    });
  });

  it('should accept a custom object', () => {
    const exc = new MethodNotAllowedException({ foo: 'bar' });
    expect(exc.getResponse()).toEqual({ foo: 'bar' });
  });

  it('should accept a cause option', () => {
    const cause = new Error('root cause');
    const exc = new MethodNotAllowedException('test', { cause });
    expect(exc.cause).toBe(cause);
  });

  it('should extend HttpException', () => {
    const exc = new MethodNotAllowedException();
    expect(exc).toBeInstanceOf(HttpException);
    expect(exc).toBeInstanceOf(Error);
  });
});
