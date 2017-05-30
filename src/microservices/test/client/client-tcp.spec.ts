import * as sinon from 'sinon';
import { expect } from 'chai';
import { ClientTCP } from '../../client/client-tcp';

describe('ClientTCP', () => {
    const client = new ClientTCP({});
    let socket: {
        connect: sinon.SinonSpy,
        sendMessage: sinon.SinonSpy,
        on: sinon.SinonStub,
        close: sinon.SinonSpy,
    };
    let createSocketStub: sinon.SinonStub;

    beforeEach(() => {
        socket = {
            connect: sinon.spy(),
            sendMessage: sinon.spy(),
            on: sinon.stub().callsFake((event, callback) => callback({})),
            close: sinon.spy(),
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
            client.sendSingleMessage(msg, () => ({}));
        });
        it('should connect to server', () => {
            expect(socket.connect.called).to.be.true;
        });
        describe('after connection', () => {
            it('should send message', () => {
                expect(socket.sendMessage.called).to.be.true;
                expect(socket.sendMessage.calledWith(msg)).to.be.true;
            });
            it('should listen on messages', () => {
                expect(socket.on.called).to.be.true;
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
            it('should close server', () => {
                expect(socket.close.called).to.be.true;
            });
            it('should emit disposed callback', () => {
                expect(callback.called).to.be.true;
                expect(callback.calledWith(null, null, true)).to.be.true;
            });
        });
        describe('when not disposed', () => {
            let buffer;
            beforeEach(() => {
                buffer = { err: 'test', response: 'res' };
                callback = sinon.spy();
                client.handleResponse(socket, callback, buffer);
            });
            it('should not close server', () => {
                expect(socket.close.called).to.be.false;
            });
            it('should call callback with error and response data', () => {
                expect(callback.called).to.be.true;
                expect(callback.calledWith(buffer.err, buffer.response)).to.be.true;
            });
        });
    });
});