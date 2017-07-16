"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const chai_1 = require("chai");
const constants_1 = require("../../constants");
const server_redis_1 = require("../../server/server-redis");
describe('ServerRedis', () => {
    let server;
    beforeEach(() => {
        server = new server_redis_1.ServerRedis({});
    });
    describe('listen', () => {
        let createRedisClient;
        let onSpy;
        let client;
        beforeEach(() => {
            onSpy = sinon.spy();
            client = {
                on: onSpy,
            };
            createRedisClient = sinon.stub(server, 'createRedisClient').callsFake(() => client);
        });
        it('should bind "error" event to handler', () => {
            server.listen(null);
            chai_1.expect(onSpy.getCall(0).args[0]).to.be.equal('error');
        });
        it('should bind "connect" event to handler', () => {
            server.listen(null);
            chai_1.expect(onSpy.getCall(2).args[0]).to.be.equal('connect');
        });
    });
    describe('close', () => {
        const pub = { quit: sinon.spy() };
        const sub = { quit: sinon.spy() };
        beforeEach(() => {
            server.pub = pub;
            server.sub = sub;
        });
        it('should close pub & sub server', () => {
            server.close();
            chai_1.expect(pub.quit.called).to.be.true;
            chai_1.expect(sub.quit.called).to.be.true;
        });
    });
    describe('handleConnection', () => {
        let onSpy, subscribeSpy, sub;
        beforeEach(() => {
            onSpy = sinon.spy();
            subscribeSpy = sinon.spy();
            sub = {
                on: onSpy,
                subscribe: subscribeSpy,
            };
        });
        it('should bind "message" event to handler', () => {
            server.handleConnection(null, sub, null);
            chai_1.expect(onSpy.getCall(0).args[0]).to.be.equal('message');
        });
        it('should subscribe each acknowledge patterns', () => {
            const pattern = 'test';
            const handler = sinon.spy();
            server.messageHandlers = {
                [pattern]: handler,
            };
            server.handleConnection(null, sub, null);
            const expectedPattern = 'test_ack';
            chai_1.expect(subscribeSpy.calledWith(expectedPattern)).to.be.true;
        });
        it('should call callback if exists', () => {
            const callback = sinon.spy();
            server.handleConnection(callback, sub, null);
            chai_1.expect(callback.calledOnce).to.be.true;
        });
    });
    describe('getMessageHandler', () => {
        it(`should return function`, () => {
            chai_1.expect(typeof server.getMessageHandler(null)).to.be.eql('function');
        });
    });
    describe('handleMessage', () => {
        let getPublisherSpy;
        const channel = 'test';
        const data = 'test';
        beforeEach(() => {
            getPublisherSpy = sinon.spy();
            sinon.stub(server, 'getPublisher').callsFake(() => getPublisherSpy);
            sinon.stub(server, 'tryParse').callsFake(() => ({ data }));
        });
        it(`should publish NO_PATTERN_MESSAGE if pattern not exists in messageHandlers object`, () => {
            server.handleMessage(channel, {}, null);
            chai_1.expect(getPublisherSpy.calledWith({ err: constants_1.NO_PATTERN_MESSAGE })).to.be.true;
        });
        it(`should call handler with expected arguments`, () => {
            const handler = sinon.spy();
            server.messageHandlers = {
                [channel]: handler,
            };
            server.handleMessage(channel, {}, null);
            chai_1.expect(handler.calledWith(data)).to.be.true;
        });
    });
    describe('getPublisher', () => {
        let publisherSpy;
        let pub, publisher;
        const pattern = 'test';
        beforeEach(() => {
            publisherSpy = sinon.spy();
            pub = {
                publish: publisherSpy,
            };
            publisher = server.getPublisher(pub, pattern);
        });
        it(`should return function`, () => {
            chai_1.expect(typeof server.getPublisher(null, null)).to.be.eql('function');
        });
        it(`should call "publish" with expected arguments`, () => {
            const respond = 'test';
            publisher(respond);
            chai_1.expect(publisherSpy.calledWith(`${pattern}_res`, JSON.stringify(respond))).to.be.true;
        });
    });
    describe('tryParse', () => {
        it(`should return parsed json`, () => {
            const obj = { test: 'test' };
            chai_1.expect(server.tryParse(obj)).to.deep.equal(JSON.parse(JSON.stringify(obj)));
        });
        it(`should not parse argument if it is not an object`, () => {
            const content = 'test';
            chai_1.expect(server.tryParse(content)).to.equal(content);
        });
    });
    describe('getAckPatternName', () => {
        const test = 'test';
        it(`should append _ack to string`, () => {
            const expectedResult = test + '_ack';
            chai_1.expect(server.getAckQueueName(test)).to.equal(expectedResult);
        });
    });
    describe('getResPatternName', () => {
        const test = 'test';
        it(`should append _res to string`, () => {
            const expectedResult = test + '_res';
            chai_1.expect(server.getResQueueName(test)).to.equal(expectedResult);
        });
    });
});
//# sourceMappingURL=server-redis.spec.js.map