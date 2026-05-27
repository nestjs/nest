import { HttpException, ImATeapotException } from '../../exceptions/index.js';

describe('ImATeapotException', () => {
  it('should return 418 as status code', () => {
    const exc = new ImATeapotException();
    expect(exc.getStatus()).toBe(418);
  });

  it("should return default I'm a teapot message", () => {
    const exc = new ImATeapotException();
    expect(exc.getResponse()).toEqual({
      message: "I'm a teapot",
      statusCode: 418,
    });
  });

  it('should accept a custom message', () => {
    const exc = new ImATeapotException('Custom error');
    expect(exc.getResponse()).toEqual({
      message: 'Custom error',
      error: "I'm a teapot",
      statusCode: 418,
    });
  });

  it('should accept a custom object', () => {
    const exc = new ImATeapotException({ foo: 'bar' });
    expect(exc.getResponse()).toEqual({ foo: 'bar' });
  });

  it('should accept a cause option', () => {
    const cause = new Error('root cause');
    const exc = new ImATeapotException('test', { cause });
    expect(exc.cause).toBe(cause);
  });

  it('should extend HttpException', () => {
    const exc = new ImATeapotException();
    expect(exc).toBeInstanceOf(HttpException);
    expect(exc).toBeInstanceOf(Error);
  });
});
