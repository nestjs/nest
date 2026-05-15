import { rethrow } from '../../helpers/rethrow.js';

describe('rethrow', () => {
  it('should throw an Error instance', () => {
    const err = new Error('test error');
    expect(() => rethrow(err)).toThrow(err);
  });

  it('should throw a string', () => {
    expect(() => rethrow('string error')).toThrow('string error');
  });

  it('should throw a number', () => {
    expect(() => rethrow(42)).toThrow();
  });

  it('should throw null', () => {
    expect(() => rethrow(null)).toThrow();
  });

  it('should throw undefined', () => {
    expect(() => rethrow(undefined)).toThrow();
  });

  it('should throw a custom object', () => {
    const obj = { code: 'FAIL', message: 'custom error' };
    try {
      rethrow(obj);
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBe(obj);
    }
  });
});
