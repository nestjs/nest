import { Logger } from '@nestjs/common';
import { SilentLogger } from '../../../injector/helpers/silent-logger.js';

describe('SilentLogger', () => {
  let silentLogger: SilentLogger;

  beforeEach(() => {
    silentLogger = new SilentLogger();
  });

  it('should be an instance of Logger', () => {
    expect(silentLogger).toBeInstanceOf(Logger);
  });

  describe('logging methods', () => {
    it('should have log method that does nothing', () => {
      expect(() => silentLogger.log()).not.toThrow();
      expect(silentLogger.log()).toBeUndefined();
    });

    it('should have error method that does nothing', () => {
      expect(() => silentLogger.error()).not.toThrow();
      expect(silentLogger.error()).toBeUndefined();
    });

    it('should have warn method that does nothing', () => {
      expect(() => silentLogger.warn()).not.toThrow();
      expect(silentLogger.warn()).toBeUndefined();
    });

    it('should have debug method that does nothing', () => {
      expect(() => silentLogger.debug()).not.toThrow();
      expect(silentLogger.debug()).toBeUndefined();
    });

    it('should have verbose method that does nothing', () => {
      expect(() => silentLogger.verbose()).not.toThrow();
      expect(silentLogger.verbose()).toBeUndefined();
    });

    it('should have fatal method that does nothing', () => {
      expect(() => silentLogger.fatal()).not.toThrow();
      expect(silentLogger.fatal()).toBeUndefined();
    });

    it('should have setLogLevels method that does nothing', () => {
      expect(() => silentLogger.setLogLevels()).not.toThrow();
      expect(silentLogger.setLogLevels()).toBeUndefined();
    });
  });
});
