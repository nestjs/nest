import { ExceptionHandler } from '../../../errors/exception-handler.js';
import { RuntimeException } from '../../../errors/exceptions/runtime.exception.js';

describe('ExceptionHandler', () => {
  let instance: ExceptionHandler;
  beforeEach(() => {
    instance = new ExceptionHandler();
  });
  describe('handle', () => {
    let logger: { error: Function };
    let errorSpy: ReturnType<typeof vi.fn>;
    beforeEach(() => {
      logger = {
        error: () => {},
      };
      (ExceptionHandler as any).logger = logger;
      errorSpy = vi.spyOn(logger, 'error');
    });
    it('should call the logger.error method with the thrown exception passed as an argument', () => {
      const exception = new RuntimeException('msg');
      instance.handle(exception);
      expect(errorSpy).toHaveBeenCalledWith(exception);
    });
  });
});
