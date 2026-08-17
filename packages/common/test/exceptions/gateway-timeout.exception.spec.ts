import {
  HttpException,
  GatewayTimeoutException,
} from '../../exceptions/index.js';

describe('GatewayTimeoutException', () => {
  it('should return 504 as status code', () => {
    const exc = new GatewayTimeoutException();
    expect(exc.getStatus()).toBe(504);
  });

  it('should return "Gateway Timeout" as default message', () => {
    const exc = new GatewayTimeoutException();
    expect(exc.getResponse()).toEqual({
      message: 'Gateway Timeout',
      statusCode: 504,
    });
  });

  it('should accept a custom message', () => {
    const exc = new GatewayTimeoutException('Custom error');
    expect(exc.getResponse()).toEqual({
      message: 'Custom error',
      error: 'Gateway Timeout',
      statusCode: 504,
    });
  });

  it('should accept a custom object', () => {
    const exc = new GatewayTimeoutException({ foo: 'bar' });
    expect(exc.getResponse()).toEqual({ foo: 'bar' });
  });

  it('should accept a cause option', () => {
    const cause = new Error('root cause');
    const exc = new GatewayTimeoutException('test', { cause });
    expect(exc.cause).toBe(cause);
  });

  it('should extend HttpException', () => {
    const exc = new GatewayTimeoutException();
    expect(exc).toBeInstanceOf(HttpException);
    expect(exc).toBeInstanceOf(Error);
  });
});
