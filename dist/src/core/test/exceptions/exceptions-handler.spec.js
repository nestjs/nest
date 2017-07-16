"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const chai_1 = require("chai");
const exceptions_handler_1 = require("../../exceptions/exceptions-handler");
const http_exception_1 = require("../../exceptions/http-exception");
const logger_service_1 = require("../../../common/services/logger.service");
const nest_environment_enum_1 = require("../../../common/enums/nest-environment.enum");
const invalid_exception_filter_exception_1 = require("../../errors/exceptions/invalid-exception-filter.exception");
describe('ExceptionsHandler', () => {
    let handler;
    let statusStub;
    let jsonStub;
    let response;
    before(() => logger_service_1.Logger.setMode(nest_environment_enum_1.NestEnvironment.TEST));
    beforeEach(() => {
        handler = new exceptions_handler_1.ExceptionsHandler();
        statusStub = sinon.stub();
        jsonStub = sinon.stub();
        response = {
            status: statusStub,
            json: jsonStub,
        };
        response.status.returns(response);
        response.json.returns(response);
    });
    describe('next', () => {
        it('should method send expected response status code and message when exception is unknown', () => {
            handler.next(new Error(), response);
            chai_1.expect(statusStub.calledWith(500)).to.be.true;
            chai_1.expect(jsonStub.calledWith({ message: 'Unknown exception' })).to.be.true;
        });
        describe('when exception is instance of HttpException', () => {
            it('should method send expected response status code and json object', () => {
                const status = 401;
                const message = {
                    custom: 'Unauthorized',
                };
                handler.next(new http_exception_1.HttpException(message, status), response);
                chai_1.expect(statusStub.calledWith(status)).to.be.true;
                chai_1.expect(jsonStub.calledWith(message)).to.be.true;
            });
            it('should method send expected response status code and transform message to json', () => {
                const status = 401;
                const message = 'Unauthorized';
                handler.next(new http_exception_1.HttpException(message, status), response);
                chai_1.expect(statusStub.calledWith(status)).to.be.true;
                chai_1.expect(jsonStub.calledWith({ message })).to.be.true;
            });
        });
        describe('when "invokeCustomFilters" returns true', () => {
            beforeEach(() => {
                sinon.stub(handler, 'invokeCustomFilters').returns(true);
            });
            it('should not call status and json stubs', () => {
                chai_1.expect(statusStub.notCalled).to.be.true;
                chai_1.expect(jsonStub.notCalled).to.be.true;
            });
        });
    });
    describe('setCustomFilters', () => {
        const filters = ['test', 'test2'];
        it('should set custom filters', () => {
            handler.setCustomFilters(filters);
            chai_1.expect(handler.filters).to.be.eql(filters);
        });
        it('should throws exception when passed argument is not an array', () => {
            chai_1.expect(() => handler.setCustomFilters(null)).to.throws(invalid_exception_filter_exception_1.InvalidExceptionFilterException);
        });
    });
    describe('invokeCustomFilters', () => {
        describe('when filters array is empty', () => {
            it('should returns false', () => {
                chai_1.expect(handler.invokeCustomFilters(null, null)).to.be.false;
            });
        });
        describe('when filters array is not empty', () => {
            let filters, funcSpy;
            class TestException {
            }
            beforeEach(() => {
                funcSpy = sinon.spy();
            });
            describe('when filter exists in filters array', () => {
                beforeEach(() => {
                    filters = [
                        { exceptionMetatypes: [TestException], func: funcSpy },
                    ];
                    handler.filters = filters;
                });
                it('should call funcSpy', () => {
                    handler.invokeCustomFilters(new TestException(), null);
                    chai_1.expect(funcSpy.notCalled).to.be.false;
                });
                it('should call funcSpy with exception and response passed as an arguments', () => {
                    const exception = new TestException();
                    const res = { foo: 'bar' };
                    handler.invokeCustomFilters(exception, res);
                    chai_1.expect(funcSpy.calledWith(exception, res)).to.be.true;
                });
                it('should returns true', () => {
                    chai_1.expect(handler.invokeCustomFilters(new TestException(), null)).to.be.true;
                });
            });
            describe('when filter does not exists in filters array', () => {
                it('should not call funcSpy', () => {
                    handler.invokeCustomFilters(new TestException(), null);
                    chai_1.expect(funcSpy.notCalled).to.be.true;
                });
                it('should returns false', () => {
                    chai_1.expect(handler.invokeCustomFilters(new TestException(), null)).to.be.false;
                });
            });
        });
    });
});
//# sourceMappingURL=exceptions-handler.spec.js.map