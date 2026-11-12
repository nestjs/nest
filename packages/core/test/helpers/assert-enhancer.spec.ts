import { InvalidEnhancerException } from '../../errors/exceptions/invalid-enhancer.exception.js';
import { Logger } from '@nestjs/common';
import {
  assertEnhancer,
  describeEnhancer,
  warnOnInvalidFilter,
} from '../../helpers/assert-enhancer.js';

describe('assertEnhancer', () => {
  it('should accept an instance that implements the method', () => {
    expect(() =>
      assertEnhancer({ canActivate: () => true }, 'guard'),
    ).not.toThrow();
    expect(() => assertEnhancer({ transform: () => 1 }, 'pipe')).not.toThrow();
    expect(() =>
      assertEnhancer({ intercept: () => 1 }, 'interceptor'),
    ).not.toThrow();
  });

  it('should accept a class that has the method as a static', () => {
    class StaticGuard {
      static canActivate() {
        return true;
      }
    }
    expect(() => assertEnhancer(StaticGuard, 'guard')).not.toThrow();
  });

  it('should throw for anything else', () => {
    abstract class AbstractGuard {
      abstract canActivate(): boolean;
    }
    for (const value of [AbstractGuard, {}, [], Promise.resolve(), null]) {
      expect(() => assertEnhancer(value, 'guard')).toThrow(
        InvalidEnhancerException,
      );
    }
  });

  it('should describe what was bound', () => {
    class Named {}
    expect(describeEnhancer(Named)).toBe('class Named');
    expect(describeEnhancer(new Named())).toBe('an instance of Named');
    expect(describeEnhancer({})).toBe('an object');
    expect(describeEnhancer(Promise.resolve())).toBe('a promise');
    expect(describeEnhancer([])).toBe('an array');
  });
});

describe('warnOnInvalidFilter', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('should not warn for an instance or a class with a static "catch"', () => {
    class StaticFilter {
      static catch() {}
    }
    warnOnInvalidFilter({ catch: () => undefined });
    warnOnInvalidFilter(StaticFilter);
    expect(warn).not.toHaveBeenCalled();
  });

  it('should warn for anything else, without throwing', () => {
    class HttpExceptionFilter {
      catch() {}
    }
    for (const value of [HttpExceptionFilter, {}, [], Promise.resolve()]) {
      expect(() => warnOnInvalidFilter(value)).not.toThrow();
    }
    expect(warn).toHaveBeenCalledTimes(4);
    expect(warn.mock.calls[0][0]).toContain(
      'The exception filter (class HttpExceptionFilter) doesn\'t provide the "catch" method',
    );
  });
});
