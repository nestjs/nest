import { TestingLogger } from '../services/testing-logger.service.js';

describe('TestingLogger', () => {
  let logger: TestingLogger;
  let superErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logger = new TestingLogger();
    superErrorSpy = vi
      .spyOn(Object.getPrototypeOf(TestingLogger.prototype), 'error')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log', () => {
    it('should be a no-op', () => {
      expect(() => logger.log('message')).not.toThrow();
    });
  });

  describe('warn', () => {
    it('should be a no-op', () => {
      expect(() => logger.warn('message')).not.toThrow();
    });
  });

  describe('debug', () => {
    it('should be a no-op', () => {
      expect(() => logger.debug('message')).not.toThrow();
    });
  });

  describe('verbose', () => {
    it('should be a no-op', () => {
      expect(() => logger.verbose('message')).not.toThrow();
    });
  });

  describe('error', () => {
    it('should delegate to super.error', () => {
      logger.error('something went wrong');
      expect(superErrorSpy).toHaveBeenCalledWith('something went wrong');
    });

    it('should pass optional params to super.error', () => {
      logger.error('error message', 'stack trace');
      expect(superErrorSpy).toHaveBeenCalledWith(
        'error message',
        'stack trace',
      );
    });
  });
});
