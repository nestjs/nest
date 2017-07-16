"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const chai_1 = require("chai");
const client_tcp_1 = require("../../client/client-tcp");
describe('ClientTCP', () => {
    const client = new client_tcp_1.ClientTCP({});
    let socket;
    let createSocketStub;
    beforeEach(() => {
        socket = {
            connect: sinon.spy(),
            sendMessage: sinon.spy(),
            on: sinon.stub().callsFake((event, callback) => event !== 'error' && event !== 'close' && callback({})),
            end: sinon.spy(),
        };
        createSocketStub = sinon.stub(client, 'createSocket').callsFake(() => socket);
    });
    afterEach(() => {
        createSocketStub.restore();
    });
    describe('sendSingleMessage', () => {
        let msg;
        beforeEach(() => {
            msg = { test: 3 };
        });
        it('should connect to server when is not connected', (done) => {
            client['sendSingleMessage'](msg, () => ({})).then(() => {
                chai_1.expect(socket.connect.calledOnce).to.be.true;
                done();
            });
        });
        it('should not connect to server when is already connected', () => {
            client.isConnected = true;
            client['sendSingleMessage'](msg, () => ({}));
            chai_1.expect(socket.connect.called).to.be.false;
        });
        describe('after connection', () => {
            it('should send message', (done) => {
                client.isConnected = false;
                client['sendSingleMessage'](msg, () => ({})).then(() => {
                    chai_1.expect(socket.sendMessage.called).to.be.true;
                    chai_1.expect(socket.sendMessage.calledWith(msg)).to.be.true;
                    done();
                });
            });
            it('should listen on messages', (done) => {
                client.isConnected = false;
                client['sendSingleMessage'](msg, () => ({})).then(() => {
                    chai_1.expect(socket.on.called).to.be.true;
                    done();
                });
            });
        });
    });
    describe('handleResponse', () => {
        let callback;
        describe('when disposed', () => {
            beforeEach(() => {
                callback = sinon.spy();
                client.handleResponse(socket, callback, { disposed: true });
            });
            it('should end server', () => {
                chai_1.expect(socket.end.called).to.be.true;
            });
            it('should emit disposed callback', () => {
                chai_1.expect(callback.called).to.be.true;
                chai_1.expect(callback.calledWith(null, null, true)).to.be.true;
            });
        });
        describe('when not disposed', () => {
            let buffer;
            beforeEach(() => {
                buffer = { err: 'test', response: 'res' };
                callback = sinon.spy();
                client.handleResponse(socket, callback, buffer);
            });
            it('should not end server', () => {
                chai_1.expect(socket.end.called).to.be.false;
            });
            it('should call callback with error and response data', () => {
                chai_1.expect(callback.called).to.be.true;
                chai_1.expect(callback.calledWith(buffer.err, buffer.response)).to.be.true;
            });
        });
    });
    describe('close', () => {
        beforeEach(() => {
            client.socket = socket;
            client.isConnected = true;
            client.close();
        });
        it('should end() socket', () => {
            chai_1.expect(socket.end.called).to.be.true;
        });
        it('should set "isConnected" to false', () => {
            chai_1.expect(client.isConnected).to.be.false;
        });
        it('should set "socket" to null', () => {
            chai_1.expect(client.socket).to.be.null;
        });
    });
});
//# sourceMappingURL=client-tcp.spec.js.map