import { Logger } from '@nestjs/common';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { LegacyRouteConverter } from '../../router/legacy-route-converter';

describe('LegacyRouteConverter', () => {
  describe('tryConvert', () => {
    let warnStub: sinon.SinonStub;

    beforeEach(() => {
      warnStub = sinon.stub(Logger.prototype, 'warn');
    });
    afterEach(() => {
      sinon.restore();
    });

    it('should convert a trailing "*" wildcard to a named parameter', () => {
      expect(LegacyRouteConverter.tryConvert('/v1/*')).to.equal('/v1/{*path}');
    });

    it('should convert a trailing "(.*)" wildcard to a named parameter', () => {
      expect(LegacyRouteConverter.tryConvert('/v1/(.*)')).to.equal(
        '/v1/{*path}',
      );
    });

    it('should convert a trailing "+" wildcard to a named parameter', () => {
      expect(LegacyRouteConverter.tryConvert('/v1/+')).to.equal('/v1/*path');
    });

    it('should convert wildcard segments in the middle of the path', () => {
      expect(LegacyRouteConverter.tryConvert('/v1/*/users')).to.equal(
        '/v1/*path3/users',
      );
    });

    it('should leave routes without legacy wildcards untouched', () => {
      expect(LegacyRouteConverter.tryConvert('/v1/users')).to.equal(
        '/v1/users',
      );
    });

    it('should not warn for the bare "all" wildcard', () => {
      LegacyRouteConverter.tryConvert('*');
      expect(warnStub.called).to.be.false;
    });

    it('should include the auto-converted route in the warning message', () => {
      LegacyRouteConverter.tryConvert('/v1/*');
      expect(warnStub.calledOnce).to.be.true;
      expect(warnStub.firstCall.firstArg).to.contain(
        'Attempting to auto-convert to "/v1/{*path}"...',
      );
      expect(warnStub.firstCall.firstArg).to.contain(
        'Unsupported route path: "/v1/*"',
      );
    });

    it('should not log when logging is disabled', () => {
      LegacyRouteConverter.tryConvert('/v1/*', { logs: false });
      expect(warnStub.called).to.be.false;
    });
  });

  describe('printWarning', () => {
    let warnStub: sinon.SinonStub;

    beforeEach(() => {
      warnStub = sinon.stub(Logger.prototype, 'warn');
    });
    afterEach(() => {
      sinon.restore();
    });

    it('should fall back to the generic message when no converted route is given', () => {
      LegacyRouteConverter.printWarning('/v1/*');
      expect(warnStub.firstCall.firstArg).to.contain(
        'Attempting to auto-convert...',
      );
      expect(warnStub.firstCall.firstArg).to.not.contain('auto-convert to');
    });
  });
});
