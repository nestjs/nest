import { HttpException, MisdirectedException } from '../../exceptions/index.js';

describe('MisdirectedException', () => {
  it('should return 421 as status code', () => {
    const exc = new MisdirectedException();
    expect(exc.getStatus()).toBe(421);
  });

  it('should return "Misdirected" as default message', () => {
    const exc = new MisdirectedException();
    expect(exc.getResponse()).toEqual({
      message: 'Misdirected',
      statusCode: 421,
    });
  });

  it('should accept a custom message', () => {
    const exc = new MisdirectedException('Custom error');
    expect(exc.getResponse()).toEqual({
      message: 'Custom error',
      error: 'Misdirected',
      statusCode: 421,
    });
  });

  it('should accept a custom object', () => {
    const exc = new MisdirectedException({ foo: 'bar' });
    expect(exc.getResponse()).toEqual({ foo: 'bar' });
  });

  it('should accept a cause option', () => {
    const cause = new Error('root cause');
    const exc = new MisdirectedException('test', { cause });
    expect(exc.cause).toBe(cause);
  });

  it('should extend HttpException', () => {
    const exc = new MisdirectedException();
    expect(exc).toBeInstanceOf(HttpException);
    expect(exc).toBeInstanceOf(Error);
  });
});
