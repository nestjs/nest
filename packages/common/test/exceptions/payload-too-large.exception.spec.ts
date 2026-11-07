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

  it('should carry the limit given in its options', () => {
    const exc = new PayloadTooLargeException('File too large', {
      limit: 1024,
    });
    expect(exc.limit).toBe(1024);
  });

  it('should leave the limit out of the response body', () => {
    expect(
      new PayloadTooLargeException('File too large', {
        limit: 1024,
      }).getResponse(),
    ).toEqual(new PayloadTooLargeException('File too large').getResponse());
    expect(
      new PayloadTooLargeException(undefined, { limit: 1024 }).getResponse(),
    ).toEqual({ message: 'Payload Too Large', statusCode: 413 });
  });

  it('should not have a limit when none is given', () => {
    expect(new PayloadTooLargeException()).not.toHaveProperty('limit');
    expect(new PayloadTooLargeException('x', 'Too Big')).not.toHaveProperty(
      'limit',
    );
    expect(new PayloadTooLargeException('x', {})).not.toHaveProperty('limit');
  });

  it('should accept a description and a cause along with the limit', () => {
    const cause = new Error('root cause');
    const exc = new PayloadTooLargeException('x', {
      cause,
      description: 'Too Big',
      limit: 1,
    });
    expect(exc.cause).toBe(cause);
    expect(exc.limit).toBe(1);
    expect(exc.getResponse()).toEqual({
      message: 'x',
      error: 'Too Big',
      statusCode: 413,
    });
  });

  it('should extend HttpException', () => {
    const exc = new PayloadTooLargeException();
    expect(exc).toBeInstanceOf(HttpException);
    expect(exc).toBeInstanceOf(Error);
  });
});
