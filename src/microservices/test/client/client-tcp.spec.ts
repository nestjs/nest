import * as sinon from 'sinon';
import { expect } from 'chai';
import { ClientTCP } from '../../client/client-tcp';

describe('ClientTCP', () => {
    const client = new ClientTCP({});
    let socket: {
        connect: sinon.SinonSpy,
        sendMessage: sinon.SinonSpy,
        on: sinon.SinonStub,
        end: sinon.SinonSpy,
    };
    let createSocketStub: sinon.SinonStub;

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
                expect(socket.connect.calledOnce).to.be.true;
                done();
            });
        });
        it('should not connect to server when is already connected', () => {
            (client as any).isConnected = true;
            client['sendSingleMessage'](msg, () => ({}));
            expect(socket.connect.called).to.be.false;
        });
        describe('after connection', () => {
            it('should send message', (done) => {
                (client as any).isConnected = false;
                client['sendSingleMessage'](msg, () => ({})).then(() => {
                    expect(socket.sendMessage.called).to.be.true;
                    expect(socket.sendMessage.calledWith(msg)).to.be.true;
                    done();
                });
            });
            it('should listen on messages', (done) => {
                (client as any).isConnected = false;
                client['sendSingleMessage'](msg, () => ({})).then(() => {
                    expect(socket.on.called).to.be.true;
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
                expect(socket.end.called).to.be.true;
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
            it('should not end server', () => {
                expect(socket.end.called).to.be.false;
            });
            it('should call callback with error and response data', () => {
                expect(callback.called).to.be.true;
                expect(callback.calledWith(buffer.err, buffer.response)).to.be.true;
            });
        });
    });
    describe('close', () => {
        beforeEach(() => {
            (client as any).socket = socket;
            (client as any).isConnected = true;
            client.close();
        });
        it('should end() socket', () => {
            expect(socket.end.called).to.be.true;
        });
        it('should set "isConnected" to false', () => {
            expect((client as any).isConnected).to.be.false;
        });
        it('should set "socket" to null', () => {
            expect((client as any).socket).to.be.null;
        });
    });
});