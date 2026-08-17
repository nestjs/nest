import {
  HttpException,
  PreconditionFailedException,
} from '../../exceptions/index.js';

describe('PreconditionFailedException', () => {
  it('should return 412 as status code', () => {
    const exc = new PreconditionFailedException();
    expect(exc.getStatus()).toBe(412);
  });

  it('should return "Precondition Failed" as default message', () => {
    const exc = new PreconditionFailedException();
    expect(exc.getResponse()).toEqual({
      message: 'Precondition Failed',
      statusCode: 412,
    });
  });

  it('should accept a custom message', () => {
    const exc = new PreconditionFailedException('Custom error');
    expect(exc.getResponse()).toEqual({
      message: 'Custom error',
      error: 'Precondition Failed',
      statusCode: 412,
    });
  });

  it('should accept a custom object', () => {
    const exc = new PreconditionFailedException({ foo: 'bar' });
    expect(exc.getResponse()).toEqual({ foo: 'bar' });
  });

  it('should accept a cause option', () => {
    const cause = new Error('root cause');
    const exc = new PreconditionFailedException('test', { cause });
    expect(exc.cause).toBe(cause);
  });

  it('should extend HttpException', () => {
    const exc = new PreconditionFailedException();
    expect(exc).toBeInstanceOf(HttpException);
    expect(exc).toBeInstanceOf(Error);
  });
});
