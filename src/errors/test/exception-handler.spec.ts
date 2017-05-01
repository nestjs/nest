import * as sinon from 'sinon';
import { expect } from 'chai';
import { ExceptionHandler } from '../exception-handler';
import { RuntimeException } from '../exceptions/runtime.exception';
import { InvalidMiddlewareException } from '../exceptions/invalid-middleware.exception';

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
            (instance as any).logger = logger;
            errorSpy = sinon.spy(logger, 'error');
        });
        it('when exception is instanceof RuntimeException', () => {
            const exception = new RuntimeException('msg');
            instance.handle(exception);
            expect(errorSpy.calledWith(exception.message, exception.stack)).to.be.true;
        });
        it('when exception is not instanceof RuntimeException', () => {
            const exception = new InvalidMiddlewareException('msg');
            instance.handle(exception);
            expect(errorSpy.calledWith(exception.what(), exception.stack)).to.be.true;
        });
    });
});