import { expect } from 'chai';
import { InvalidEnhancerException } from '../../errors/exceptions/invalid-enhancer.exception';
import {
  assertEnhancer,
  describeEnhancer,
} from '../../helpers/assert-enhancer';

describe('assertEnhancer', () => {
  it('should accept an instance that implements the method', () => {
    expect(() =>
      assertEnhancer({ canActivate: () => true }, 'guard'),
    ).not.to.throw();
    expect(() => assertEnhancer({ transform: () => 1 }, 'pipe')).not.to.throw();
    expect(() =>
      assertEnhancer({ intercept: () => 1 }, 'interceptor'),
    ).not.to.throw();
  });

  it('should accept a class that has the method as a static', () => {
    class StaticGuard {
      static canActivate() {
        return true;
      }
    }
    expect(() => assertEnhancer(StaticGuard, 'guard')).not.to.throw();
  });

  it('should throw for anything else', () => {
    abstract class AbstractGuard {
      abstract canActivate(): boolean;
    }
    for (const value of [AbstractGuard, {}, [], Promise.resolve(), null]) {
      expect(() => assertEnhancer(value, 'guard')).to.throw(
        InvalidEnhancerException,
      );
    }
  });

  it('should describe what was bound', () => {
    class Named {}
    expect(describeEnhancer(Named)).to.equal('class Named');
    expect(describeEnhancer(new Named())).to.equal('an instance of Named');
    expect(describeEnhancer({})).to.equal('an object');
    expect(describeEnhancer(Promise.resolve())).to.equal('a promise');
    expect(describeEnhancer([])).to.equal('an array');
  });
});
