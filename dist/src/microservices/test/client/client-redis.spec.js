"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const chai_1 = require("chai");
const client_redis_1 = require("../../client/client-redis");
describe('ClientRedis', () => {
    const test = 'test';
    const client = new client_redis_1.ClientRedis({});
    describe('getAckPatternName', () => {
        it(`should append _ack to string`, () => {
            const expectedResult = test + '_ack';
            chai_1.expect(client.getAckPatternName(test)).to.equal((expectedResult));
        });
    });
    describe('getResPatternName', () => {
        it(`should append _res to string`, () => {
            const expectedResult = test + '_res';
            chai_1.expect(client.getResPatternName(test)).to.equal((expectedResult));
        });
    });
    describe('sendSingleMessage', () => {
        const pattern = 'test';
        const msg = { pattern };
        let subscribeSpy, publishSpy, onSpy, removeListenerSpy, unsubscribeSpy, initSpy, sub, pub;
        beforeEach(() => {
            subscribeSpy = sinon.spy();
            publishSpy = sinon.spy();
            onSpy = sinon.spy();
            removeListenerSpy = sinon.spy();
            unsubscribeSpy = sinon.spy();
            sub = {
                subscribe: subscribeSpy,
                on: onSpy,
                removeListener: removeListenerSpy,
                unsubscribe: unsubscribeSpy,
            };
            pub = { publish: publishSpy };
            client.sub = sub;
            client.pub = pub;
            initSpy = sinon.spy(client, 'init');
        });
        afterEach(() => {
            initSpy.restore();
        });
        it('should not call "init()" when pub and sub are null', () => {
            client['sendSingleMessage'](msg, () => { });
            chai_1.expect(initSpy.called).to.be.false;
        });
        it('should call "init()" when pub and sub are null', () => {
            client.sub = null;
            client.pub = null;
            client['sendSingleMessage'](msg, () => { });
            chai_1.expect(initSpy.called).to.be.true;
        });
        it('should subscribe to response pattern name', () => {
            client['sendSingleMessage'](msg, () => { });
            chai_1.expect(subscribeSpy.calledWith(`"${pattern}"_res`)).to.be.true;
        });
        it('should publish stringified message to acknowledge pattern name', () => {
            client['sendSingleMessage'](msg, () => { });
            chai_1.expect(publishSpy.calledWith(`"${pattern}"_ack`, JSON.stringify(msg))).to.be.true;
        });
        it('should listen on messages', () => {
            client['sendSingleMessage'](msg, () => { });
            chai_1.expect(onSpy.called).to.be.true;
        });
        describe('responseCallback', () => {
            let callback, subscription;
            const resMsg = {
                err: 'err',
                response: 'test',
            };
            describe('not disposed', () => {
                beforeEach(() => {
                    callback = sinon.spy();
                    subscription = client['sendSingleMessage'](msg, callback);
                    subscription(null, JSON.stringify(resMsg));
                });
                it('should call callback with expected arguments', () => {
                    chai_1.expect(callback.calledWith(resMsg.err, resMsg.response)).to.be.true;
                });
                it('should not unsubscribe to response pattern name', () => {
                    chai_1.expect(unsubscribeSpy.calledWith(`"${pattern}"_res`)).to.be.false;
                });
                it('should not remove listener', () => {
                    chai_1.expect(removeListenerSpy.called).to.be.false;
                });
            });
            describe('disposed', () => {
                beforeEach(() => {
                    callback = sinon.spy();
                    subscription = client['sendSingleMessage'](msg, callback);
                    subscription(null, JSON.stringify({ disposed: true }));
                });
                it('should call callback with dispose param', () => {
                    chai_1.expect(callback.called).to.be.true;
                    chai_1.expect(callback.calledWith(null, null, true)).to.be.true;
                });
                it('should unsubscribe to response pattern name', () => {
                    chai_1.expect(unsubscribeSpy.calledWith(`"${pattern}"_res`)).to.be.true;
                });
                it('should remove listener', () => {
                    chai_1.expect(removeListenerSpy.called).to.be.true;
                });
            });
        });
    });
    describe('close', () => {
        let pubClose;
        let subClose;
        let pub, sub;
        beforeEach(() => {
            pubClose = sinon.spy();
            subClose = sinon.spy();
            pub = { quit: pubClose };
            sub = { quit: subClose };
            client.pub = pub;
            client.sub = sub;
        });
        it('should close "pub" when it is not null', () => {
            client.close();
            chai_1.expect(pubClose.called).to.be.true;
        });
        it('should not close "pub" when it is null', () => {
            client.pub = null;
            client.close();
            chai_1.expect(pubClose.called).to.be.false;
        });
        it('should close "sub" when it is not null', () => {
            client.close();
            chai_1.expect(subClose.called).to.be.true;
        });
        it('should not close "sub" when it is null', () => {
            client.sub = null;
            client.close();
            chai_1.expect(subClose.called).to.be.false;
        });
    });
    describe('init', () => {
        let createClientSpy;
        let handleErrorsSpy;
        beforeEach(() => {
            createClientSpy = sinon.spy(client, 'createClient');
            handleErrorsSpy = sinon.spy(client, 'handleErrors');
            client.init();
        });
        afterEach(() => {
            createClientSpy.restore();
            handleErrorsSpy.restore();
        });
        it('should call "createClient" twice', () => {
            chai_1.expect(createClientSpy.calledTwice).to.be.true;
        });
        it('should call "handleErrors" twice', () => {
            chai_1.expect(handleErrorsSpy.calledTwice).to.be.true;
        });
    });
});
//# sourceMappingURL=client-redis.spec.js.map