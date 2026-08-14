import {
  HttpException,
  NotAcceptableException,
} from '../../exceptions/index.js';

describe('NotAcceptableException', () => {
  it('should return 406 as status code', () => {
    const exc = new NotAcceptableException();
    expect(exc.getStatus()).toBe(406);
  });

  it('should return "Not Acceptable" as default message', () => {
    const exc = new NotAcceptableException();
    expect(exc.getResponse()).toEqual({
      message: 'Not Acceptable',
      statusCode: 406,
    });
  });

  it('should accept a custom message', () => {
    const exc = new NotAcceptableException('Custom error');
    expect(exc.getResponse()).toEqual({
      message: 'Custom error',
      error: 'Not Acceptable',
      statusCode: 406,
    });
  });

  it('should accept a custom object', () => {
    const exc = new NotAcceptableException({ foo: 'bar' });
    expect(exc.getResponse()).toEqual({ foo: 'bar' });
  });

  it('should accept a cause option', () => {
    const cause = new Error('root cause');
    const exc = new NotAcceptableException('test', { cause });
    expect(exc.cause).toBe(cause);
  });

  it('should extend HttpException', () => {
    const exc = new NotAcceptableException();
    expect(exc).toBeInstanceOf(HttpException);
    expect(exc).toBeInstanceOf(Error);
  });
});
