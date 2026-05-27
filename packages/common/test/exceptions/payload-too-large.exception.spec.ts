import {
  HttpException,
  PayloadTooLargeException,
} from '../../exceptions/index.js';

describe('PayloadTooLargeException', () => {
  it('should return 413 as status code', () => {
    const exc = new PayloadTooLargeException();
    expect(exc.getStatus()).toBe(413);
  });

  it('should return "Payload Too Large" as default message', () => {
    const exc = new PayloadTooLargeException();
    expect(exc.getResponse()).toEqual({
      message: 'Payload Too Large',
      statusCode: 413,
    });
  });

  it('should accept a custom message', () => {
    const exc = new PayloadTooLargeException('Custom error');
    expect(exc.getResponse()).toEqual({
      message: 'Custom error',
      error: 'Payload Too Large',
      statusCode: 413,
    });
  });

  it('should accept a custom object', () => {
    const exc = new PayloadTooLargeException({ foo: 'bar' });
    expect(exc.getResponse()).toEqual({ foo: 'bar' });
  });

  it('should accept a cause option', () => {
    const cause = new Error('root cause');
    const exc = new PayloadTooLargeException('test', { cause });
    expect(exc.cause).toBe(cause);
  });

  it('should extend HttpException', () => {
    const exc = new PayloadTooLargeException();
    expect(exc).toBeInstanceOf(HttpException);
    expect(exc).toBeInstanceOf(Error);
  });
});
