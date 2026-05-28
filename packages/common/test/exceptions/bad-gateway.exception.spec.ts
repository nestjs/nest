import { HttpException, BadGatewayException } from '../../exceptions/index.js';

describe('BadGatewayException', () => {
  it('should return 502 as status code', () => {
    const exc = new BadGatewayException();
    expect(exc.getStatus()).toBe(502);
  });

  it('should return "Bad Gateway" as default message', () => {
    const exc = new BadGatewayException();
    expect(exc.getResponse()).toEqual({
      message: 'Bad Gateway',
      statusCode: 502,
    });
  });

  it('should accept a custom message', () => {
    const exc = new BadGatewayException('Custom error');
    expect(exc.getResponse()).toEqual({
      message: 'Custom error',
      error: 'Bad Gateway',
      statusCode: 502,
    });
  });

  it('should accept a custom object', () => {
    const exc = new BadGatewayException({ foo: 'bar' });
    expect(exc.getResponse()).toEqual({ foo: 'bar' });
  });

  it('should accept a cause option', () => {
    const cause = new Error('root cause');
    const exc = new BadGatewayException('test', { cause });
    expect(exc.cause).toBe(cause);
  });

  it('should extend HttpException', () => {
    const exc = new BadGatewayException();
    expect(exc).toBeInstanceOf(HttpException);
    expect(exc).toBeInstanceOf(Error);
  });
});
