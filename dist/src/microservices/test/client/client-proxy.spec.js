"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const chai_1 = require("chai");
const client_proxy_1 = require("../../client/client-proxy");
const rxjs_1 = require("rxjs");
class TestClientProxy extends client_proxy_1.ClientProxy {
    sendSingleMessage(pattern, callback) { }
}
describe('ClientProxy', () => {
    const client = new TestClientProxy();
    describe('send', () => {
        it(`should return an observable stream`, () => {
            const stream$ = client.send({}, '');
            chai_1.expect(stream$ instanceof rxjs_1.Observable).to.be.true;
        });
        it(`should call "sendSingleMessage" on subscribe`, () => {
            const pattern = { test: 3 };
            const data = 'test';
            const sendSingleMessageSpy = sinon.spy();
            const stream$ = client.send(pattern, data);
            client.sendSingleMessage = sendSingleMessageSpy;
            stream$.subscribe();
            chai_1.expect(sendSingleMessageSpy.calledOnce).to.be.true;
        });
    });
    describe('createObserver', () => {
        it(`should return function`, () => {
            chai_1.expect(typeof client['createObserver'](null)).to.be.eql('function');
        });
        describe('returned function calls', () => {
            let fn;
            const error = sinon.spy(), next = sinon.spy(), complete = sinon.spy(), observer = {
                error,
                next,
                complete,
            };
            before(() => {
                fn = client['createObserver'](observer);
            });
            it(`"error" when first parameter is not null or undefined`, () => {
                const err = 'test';
                fn(err);
                chai_1.expect(error.calledWith(err)).to.be.true;
            });
            it(`"next" when first parameter is null or undefined`, () => {
                const data = 'test';
                fn(null, data);
                chai_1.expect(next.calledWith(data)).to.be.true;
            });
            it(`"complete" when third parameter is true`, () => {
                const data = 'test';
                fn(null, data, true);
                chai_1.expect(complete.called).to.be.true;
            });
        });
    });
});
//# sourceMappingURL=client-proxy.spec.js.map