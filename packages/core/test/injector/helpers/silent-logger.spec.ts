import { expect } from 'chai';
import { Logger } from '@nestjs/common';
import { SilentLogger } from '../../../injector/helpers/silent-logger';

describe('SilentLogger', () => {
  let silentLogger: SilentLogger;

  beforeEach(() => {
    silentLogger = new SilentLogger();
  });

  it('should be an instance of Logger', () => {
    expect(silentLogger).to.be.instanceOf(Logger);
  });

  describe('logging methods', () => {
    it('should have log method that does nothing', () => {
      expect(() => silentLogger.log()).to.not.throw();
      expect(silentLogger.log()).to.be.undefined;
    });

    it('should have error method that does nothing', () => {
      expect(() => silentLogger.error()).to.not.throw();
      expect(silentLogger.error()).to.be.undefined;
    });

    it('should have warn method that does nothing', () => {
      expect(() => silentLogger.warn()).to.not.throw();
      expect(silentLogger.warn()).to.be.undefined;
    });

    it('should have debug method that does nothing', () => {
      expect(() => silentLogger.debug()).to.not.throw();
      expect(silentLogger.debug()).to.be.undefined;
    });

    it('should have verbose method that does nothing', () => {
      expect(() => silentLogger.verbose()).to.not.throw();
      expect(silentLogger.verbose()).to.be.undefined;
    });

    it('should have fatal method that does nothing', () => {
      expect(() => silentLogger.fatal()).to.not.throw();
      expect(silentLogger.fatal()).to.be.undefined;
    });

    it('should have setLogLevels method that does nothing', () => {
      expect(() => silentLogger.setLogLevels()).to.not.throw();
      expect(silentLogger.setLogLevels()).to.be.undefined;
    });
  });
});
