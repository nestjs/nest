"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const chai_1 = require("chai");
const server_1 = require("../../server/server");
const Observable_1 = require("rxjs/Observable");
class TestServer extends server_1.Server {
    listen(callback) { }
    close() { }
}
describe('Server', () => {
    const server = new TestServer();
    const callback = () => { }, pattern = { test: 'test' };
    describe('add', () => {
        it(`should add handler as a stringified pattern key`, () => {
            server.add(pattern, callback);
            const handlers = server.getHandlers();
            chai_1.expect(handlers[JSON.stringify(pattern)]).to.equal(callback);
        });
    });
    describe('send', () => {
        let stream$;
        let sendSpy;
        beforeEach(() => {
            stream$ = Observable_1.Observable.of('test');
        });
        describe('when stream', () => {
            beforeEach(() => {
                sendSpy = sinon.spy();
            });
            describe('throws exception', () => {
                beforeEach(() => {
                    server.send(Observable_1.Observable.throw('test'), sendSpy);
                });
                it('should send error', () => {
                    chai_1.expect(sendSpy.calledWith({ err: 'test', response: null })).to.be.true;
                });
                it('should send "complete" event', () => {
                    chai_1.expect(sendSpy.calledWith({ disposed: true })).to.be.true;
                });
            });
            describe('emits response', () => {
                beforeEach(() => {
                    server.send(stream$, sendSpy);
                });
                it('should send response', () => {
                    chai_1.expect(sendSpy.calledWith({ err: null, response: 'test' })).to.be.true;
                });
                it('should send "complete" event', () => {
                    chai_1.expect(sendSpy.calledWith({ disposed: true })).to.be.true;
                });
            });
        });
    });
});
//# sourceMappingURL=server.spec.js.map