"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const chai_1 = require("chai");
const exception_handler_1 = require("../exception-handler");
const runtime_exception_1 = require("../exceptions/runtime.exception");
const invalid_middleware_exception_1 = require("../exceptions/invalid-middleware.exception");
describe('ExceptionHandler', () => {
    let instance;
    beforeEach(() => {
        instance = new exception_handler_1.ExceptionHandler();
    });
    describe('handle', () => {
        let logger;
        let errorSpy;
        beforeEach(() => {
            logger = {
                error: () => { },
            };
            instance.logger = logger;
            errorSpy = sinon.spy(logger, 'error');
        });
        it('when exception is instanceof RuntimeException', () => {
            const exception = new runtime_exception_1.RuntimeException('msg');
            instance.handle(exception);
            chai_1.expect(errorSpy.calledWith(exception.message, exception.stack)).to.be.true;
        });
        it('when exception is not instanceof RuntimeException', () => {
            const exception = new invalid_middleware_exception_1.InvalidMiddlewareException('msg');
            instance.handle(exception);
            chai_1.expect(errorSpy.calledWith(exception.what(), exception.stack)).to.be.true;
        });
    });
});
//# sourceMappingURL=exception-handler.spec.js.map