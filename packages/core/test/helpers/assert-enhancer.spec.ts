import { InvalidEnhancerException } from '../../errors/exceptions/invalid-enhancer.exception.js';
import {
  assertEnhancer,
  describeEnhancer,
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
