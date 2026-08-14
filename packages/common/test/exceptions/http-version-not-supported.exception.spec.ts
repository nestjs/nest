import {
  HttpException,
  HttpVersionNotSupportedException,
} from '../../exceptions/index.js';

describe('HttpVersionNotSupportedException', () => {
  it('should return 505 as status code', () => {
    const exc = new HttpVersionNotSupportedException();
    expect(exc.getStatus()).toBe(505);
  });

  it('should return "HTTP Version Not Supported" as default message', () => {
    const exc = new HttpVersionNotSupportedException();
    expect(exc.getResponse()).toEqual({
      message: 'HTTP Version Not Supported',
      statusCode: 505,
    });
  });

  it('should accept a custom message', () => {
    const exc = new HttpVersionNotSupportedException('Custom error');
    expect(exc.getResponse()).toEqual({
      message: 'Custom error',
      error: 'HTTP Version Not Supported',
      statusCode: 505,
    });
  });

  it('should accept a custom object', () => {
    const exc = new HttpVersionNotSupportedException({ foo: 'bar' });
    expect(exc.getResponse()).toEqual({ foo: 'bar' });
  });

  it('should accept a cause option', () => {
    const cause = new Error('root cause');
    const exc = new HttpVersionNotSupportedException('test', { cause });
    expect(exc.cause).toBe(cause);
  });

  it('should extend HttpException', () => {
    const exc = new HttpVersionNotSupportedException();
    expect(exc).toBeInstanceOf(HttpException);
    expect(exc).toBeInstanceOf(Error);
  });
});
