import { ReplLogger } from '../../repl/repl-logger.js';

describe('ReplLogger', () => {
  let logger: ReplLogger;
  let superLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logger = new ReplLogger();
    // Spy on the parent class log method that ReplLogger conditionally delegates to
    superLogSpy = vi
      .spyOn(Object.getPrototypeOf(ReplLogger.prototype), 'log')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log', () => {
    it('should suppress logs with RoutesResolver context', () => {
      logger.log('some message', 'RoutesResolver');
      expect(superLogSpy).not.toHaveBeenCalled();
    });

    it('should suppress logs with RouterExplorer context', () => {
      logger.log('some message', 'RouterExplorer');
      expect(superLogSpy).not.toHaveBeenCalled();
    });

    it('should suppress logs with NestApplication context', () => {
      logger.log('some message', 'NestApplication');
      expect(superLogSpy).not.toHaveBeenCalled();
    });

    it('should pass through logs with other contexts', () => {
      logger.log('some message', 'SomeOtherContext');
      expect(superLogSpy).toHaveBeenCalled();
    });

    it('should pass through logs with no context', () => {
      logger.log('some message');
      // context is undefined, includes(undefined!) returns false, so super.log is called
      expect(superLogSpy).toHaveBeenCalled();
    });
  });
});
