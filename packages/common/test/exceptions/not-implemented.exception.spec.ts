import {
  HttpException,
  NotImplementedException,
} from '../../exceptions/index.js';

describe('NotImplementedException', () => {
  it('should return 501 as status code', () => {
    const exc = new NotImplementedException();
    expect(exc.getStatus()).toBe(501);
  });

  it('should return "Not Implemented" as default message', () => {
    const exc = new NotImplementedException();
    expect(exc.getResponse()).toEqual({
      message: 'Not Implemented',
      statusCode: 501,
    });
  });

  it('should accept a custom message', () => {
    const exc = new NotImplementedException('Custom error');
    expect(exc.getResponse()).toEqual({
      message: 'Custom error',
      error: 'Not Implemented',
      statusCode: 501,
    });
  });

  it('should accept a custom object', () => {
    const exc = new NotImplementedException({ foo: 'bar' });
    expect(exc.getResponse()).toEqual({ foo: 'bar' });
  });

  it('should accept a cause option', () => {
    const cause = new Error('root cause');
    const exc = new NotImplementedException('test', { cause });
    expect(exc.cause).toBe(cause);
  });

  it('should extend HttpException', () => {
    const exc = new NotImplementedException();
    expect(exc).toBeInstanceOf(HttpException);
    expect(exc).toBeInstanceOf(Error);
  });
});
