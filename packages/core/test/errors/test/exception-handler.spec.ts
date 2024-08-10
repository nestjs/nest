import * as sinon from 'sinon';
import { expect } from 'chai';
import { ExceptionHandler } from '../../../errors/exception-handler';
import { RuntimeException } from '../../../errors/exceptions/runtime.exception';
import { combineStackTrace } from '../../../helpers/combine-stack-trace';

describe('ExceptionHandler', () => {
  let instance: ExceptionHandler;
  beforeEach(() => {
    instance = new ExceptionHandler();
  });
  describe('handle', () => {
    let logger;
    let errorSpy: sinon.SinonSpy;
    beforeEach(() => {
      logger = {
        error: () => {},
      };
      (ExceptionHandler as any).logger = logger;
      errorSpy = sinon.spy(logger, 'error');
    });
    it('when exception is instanceof RuntimeException', () => {
      const exception = new RuntimeException('msg');
      instance.handle(exception);
      expect(
        errorSpy.calledWith(exception.what(), combineStackTrace(exception)),
      ).to.be.true;
    });
    it('when exception is not instanceof RuntimeException', () => {
      const exception = new Error('msg');
      instance.handle(exception);
      expect(
        errorSpy.calledWith(exception.message, combineStackTrace(exception)),
      ).to.be.true;
    });
  });
});
