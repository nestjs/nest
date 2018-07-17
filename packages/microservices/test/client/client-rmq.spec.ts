import * as sinon from 'sinon';
import { expect } from 'chai';
import { ClientRMQ } from '../../client/client-rmq';
import { ERROR_EVENT, CONNECT_EVENT, MESSAGE_EVENT } from '../../constants';
import { Transport } from '../../enums/transport.enum';

describe('ClientRQM', () => {
    const test = 'test';
    const client = new ClientRMQ({});

    describe('connect', () => {
        let createChannelSpy: sinon.SinonSpy,
            assertQueueSpy: sinon.SinonSpy;

        beforeEach( async () => {
            (client as any).client = {
                createChannel: createChannelSpy,
            };
            (client as any).channel = {
                assertQueue: assertQueueSpy
            };
        });

        it('should create channel on connect()', () => {
            client['connect']().then(() => {
                expect(createChannelSpy.called).to.be.true;
            });
        });

        it('should create assert queue on connect()', () => {
            client['connect']().then(() => {
                expect(assertQueueSpy.called).to.be.true;
            });
        });
    });

    describe('publish', () => {
        const pattern = 'test';
        const msg = { pattern, data: 'data' };
        let connectSpy: sinon.SinonSpy,
            assertQueueSpy: sinon.SinonSpy,
            sendToQueueSpy: sinon.SinonSpy,
            consumeSpy: sinon.SinonSpy;

        beforeEach(() => {
            (client as any).client = {};
            (client as any).channel = {
                assertQueue: assertQueueSpy,
                consume: consumeSpy,
                sendToQueue: sendToQueueSpy
            };
            connectSpy = sinon.spy(client, 'connect');
        });

        afterEach(() => {
            connectSpy.restore();
        });

        it('should not call "connect()" when client not null', () => {
            client['publish'](msg, () => {});
            expect(connectSpy.called).to.be.false;
        });

        it('should call "connect()" when client is null', () => {
            (client as any).client = null;
            client['publish'](msg, () => {});
            expect(connectSpy.called).to.be.true;
        });

        it('should assert reply queue', () => {
            client['publish'](msg, () => {
                expect(assertQueueSpy.called).to.be.true;
            });
        });

        it('should consume reply queue', () => {
            client['publish'](msg, () => {
                expect(consumeSpy.called).to.be.true;
            });
        });

        it('should send message', () => {
            client['publish'](msg, () => {
                expect(sendToQueueSpy.called).to.be.true;
            });
        });
    });

    describe('handleMessage', () => {
        const msg = {
            content: null,
            fields: {
                routingKey: 'test'
            } 
        };
        let callbackSpy: sinon.SinonSpy;
        let deleteQueueSpy: sinon.SinonSpy;
        let callback = (data) => {};

        beforeEach(() => {
            callbackSpy = sinon.spy();
            deleteQueueSpy = sinon.spy();
            (client as any).channel = { deleteQueue: deleteQueueSpy };
            callback = callbackSpy;
        });

        it('should callback if no error or isDisposed', () => {
            msg.content = JSON.stringify({ err: null, response: 'test', isDisposed: false });
            client['handleMessage'](msg, callback);
            expect(callbackSpy.called).to.be.true;
        });

        it('should delete queue if isDisposed', () => {
            msg.content = JSON.stringify({ err: null, response: 'test', isDisposed: true });
            client['handleMessage'](msg, callback);
            expect(deleteQueueSpy.called).to.be.true;
        });

        it('should delete queue if error', () => {
            msg.content = JSON.stringify({ err: true, response: 'test', isDisposed: false });
            client['handleMessage'](msg, callback);
            expect(deleteQueueSpy.called).to.be.true;
        });

        it('should callback if error', () => {
            msg.content = JSON.stringify({ err: true, response: 'test', isDisposed: false });
            client['handleMessage'](msg, callback);
            expect(callbackSpy.called).to.be.true;
        });

        it('should callback if isDisposed', () => {
            msg.content = JSON.stringify({ err: null, response: 'test', isDisposed: true });
            client['handleMessage'](msg, callback);
            expect(callbackSpy.called).to.be.true;
        });
    });

    describe('close', () => {
        let channelCloseSpy: sinon.SinonSpy;
        let clientCloseSpy: sinon.SinonSpy;
        beforeEach(() => {
            channelCloseSpy = sinon.spy();
            clientCloseSpy = sinon.spy();
            (client as any).channel = { close: channelCloseSpy };
            (client as any).client = { close: clientCloseSpy };
        });

        it('should close channel when it is not null', () => {
            client.close();
            expect(channelCloseSpy.called).to.be.true;
        });

        it('should close client when it is not null', () => {
            client.close();
            expect(clientCloseSpy.called).to.be.true;
        });
    });
});
