"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const chai_1 = require("chai");
const exceptions_zone_1 = require("../exceptions-zone");
const messages_1 = require("../messages");
describe('ExceptionsZone', () => {
    describe('run', () => {
        let callback;
        beforeEach(() => {
            callback = sinon.spy();
        });
        it('should call callback', () => {
            exceptions_zone_1.ExceptionsZone.run(callback);
            chai_1.expect(callback.called).to.be.true;
        });
        describe('when callback throws exception', () => {
            const exceptionHandler = {
                handle: () => { },
            };
            let handleSpy;
            beforeEach(() => {
                exceptions_zone_1.ExceptionsZone.exceptionHandler = exceptionHandler;
                handleSpy = sinon.spy(exceptionHandler, 'handle');
            });
            it('should call "handle" method of exceptionHandler and throws UNHANDLED_RUNTIME_EXCEPTION', () => {
                const throwsCallback = () => {
                    throw 3;
                };
                chai_1.expect(() => exceptions_zone_1.ExceptionsZone.run(throwsCallback)).to.throws(messages_1.UNHANDLED_RUNTIME_EXCEPTION);
                chai_1.expect(handleSpy.called).to.be.true;
            });
        });
    });
});
//# sourceMappingURL=exceptions-zone.spec.js.map