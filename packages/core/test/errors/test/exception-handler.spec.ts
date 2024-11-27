import { expect } from 'chai';
import * as sinon from 'sinon';
import { ExceptionHandler } from '../../../errors/exception-handler';
import { RuntimeException } from '../../../errors/exceptions/runtime.exception';

describe('ExceptionHandler', () => {
  let instance: ExceptionHandler;
  beforeEach(() => {
    instance = new ExceptionHandler();
  });
  describe('handle', () => {
    let logger: { error: Function };
    let errorSpy: sinon.SinonSpy;
    beforeEach(() => {
      logger = {
        error: () => {},
      };
      (ExceptionHandler as any).logger = logger;
      errorSpy = sinon.spy(logger, 'error');
    });
    it('should call the logger.error method with the thrown exception passed as an argument', () => {
      const exception = new RuntimeException('msg');
      instance.handle(exception);
      expect(errorSpy.calledWith(exception)).to.be.true;
    });
  });
});
