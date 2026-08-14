import {
  HttpException,
  ServiceUnavailableException,
} from '../../exceptions/index.js';

describe('ServiceUnavailableException', () => {
  it('should return 503 as status code', () => {
    const exc = new ServiceUnavailableException();
    expect(exc.getStatus()).toBe(503);
  });

  it('should return "Service Unavailable" as default message', () => {
    const exc = new ServiceUnavailableException();
    expect(exc.getResponse()).toEqual({
      message: 'Service Unavailable',
      statusCode: 503,
    });
  });

  it('should accept a custom message', () => {
    const exc = new ServiceUnavailableException('Custom error');
    expect(exc.getResponse()).toEqual({
      message: 'Custom error',
      error: 'Service Unavailable',
      statusCode: 503,
    });
  });

  it('should accept a custom object', () => {
    const exc = new ServiceUnavailableException({ foo: 'bar' });
    expect(exc.getResponse()).toEqual({ foo: 'bar' });
  });

  it('should accept a cause option', () => {
    const cause = new Error('root cause');
    const exc = new ServiceUnavailableException('test', { cause });
    expect(exc.cause).toBe(cause);
  });

  it('should extend HttpException', () => {
    const exc = new ServiceUnavailableException();
    expect(exc).toBeInstanceOf(HttpException);
    expect(exc).toBeInstanceOf(Error);
  });
});
