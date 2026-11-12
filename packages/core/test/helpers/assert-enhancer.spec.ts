import { Logger } from '@nestjs/common';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { InvalidEnhancerException } from '../../errors/exceptions/invalid-enhancer.exception';
import {
  assertEnhancer,
  describeEnhancer,
  warnOnInvalidFilter,
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

describe('warnOnInvalidFilter', () => {
  let warn: sinon.SinonStub;

  beforeEach(() => {
    warn = sinon.stub(Logger.prototype, 'warn');
  });

  afterEach(() => {
    warn.restore();
  });

  it('should not warn for an instance or a class with a static "catch"', () => {
    class StaticFilter {
      static catch() {}
    }
    warnOnInvalidFilter({ catch: () => undefined });
    warnOnInvalidFilter(StaticFilter);
    expect(warn.called).to.be.false;
  });

  it('should warn for anything else, without throwing', () => {
    class HttpExceptionFilter {
      catch() {}
    }
    for (const value of [HttpExceptionFilter, {}, [], Promise.resolve()]) {
      expect(() => warnOnInvalidFilter(value)).not.to.throw();
    }
    expect(warn.callCount).to.equal(4);
    expect(warn.firstCall.args[0]).to.contain(
      'The exception filter (class HttpExceptionFilter) doesn\'t provide the "catch" method',
    );
  });
});
