import {
  HttpException,
  UnprocessableEntityException,
} from '../../exceptions/index.js';

describe('UnprocessableEntityException', () => {
  it('should return 422 as status code', () => {
    const exc = new UnprocessableEntityException();
    expect(exc.getStatus()).toBe(422);
  });

  it('should return "Unprocessable Entity" as default message', () => {
    const exc = new UnprocessableEntityException();
    expect(exc.getResponse()).toEqual({
      message: 'Unprocessable Entity',
      statusCode: 422,
    });
  });

  it('should accept a custom message', () => {
    const exc = new UnprocessableEntityException('Custom error');
    expect(exc.getResponse()).toEqual({
      message: 'Custom error',
      error: 'Unprocessable Entity',
      statusCode: 422,
    });
  });

  it('should accept a custom object', () => {
    const exc = new UnprocessableEntityException({ foo: 'bar' });
    expect(exc.getResponse()).toEqual({ foo: 'bar' });
  });

  it('should accept a cause option', () => {
    const cause = new Error('root cause');
    const exc = new UnprocessableEntityException('test', { cause });
    expect(exc.cause).toBe(cause);
  });

  it('should extend HttpException', () => {
    const exc = new UnprocessableEntityException();
    expect(exc).toBeInstanceOf(HttpException);
    expect(exc).toBeInstanceOf(Error);
  });
});
