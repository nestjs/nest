import { expect } from 'chai';
import { EventEmitter } from 'events';
import { empty } from 'rxjs';
import * as sinon from 'sinon';
import { ClientRMQ } from '../../client/client-rmq';
// tslint:disable:no-string-literal

describe('ClientRQM', () => {
  const client = new ClientRMQ({});

  describe('connect', () => {
    let createClientStub: sinon.SinonStub;
    let handleErrorsSpy: sinon.SinonSpy;
    let connect$Stub: sinon.SinonStub;
    let mergeDisconnectEvent: sinon.SinonStub;

    beforeEach(async () => {
      createClientStub = sinon.stub(client, 'createClient').callsFake(() => ({
        addListener: () => ({}),
        removeListener: () => ({}),
      }));
      handleErrorsSpy = sinon.spy(client, 'handleError');
      connect$Stub = sinon.stub(client, 'connect$').callsFake(() => ({
        subscribe: resolve => resolve(),
        toPromise() {
          return this;
        },
        pipe() {
          return this;
        },
      }));
      mergeDisconnectEvent = sinon
        .stub(client, 'mergeDisconnectEvent')
        .callsFake((_, source) => source);
    });
    afterEach(() => {
      createClientStub.restore();
      handleErrorsSpy.restore();
      connect$Stub.restore();
      mergeDisconnectEvent.restore();
    });
    describe('when is not connected', () => {
      beforeEach(async () => {
        client['mqttClient'] = null;
        await client.connect();
      });
      it('should call "handleError" once', async () => {
        expect(handleErrorsSpy.called).to.be.true;
      });
      it('should call "createClient" once', async () => {
        expect(createClientStub.called).to.be.true;
      });
      it('should call "connect$" once', async () => {
        expect(connect$Stub.called).to.be.true;
      });
    });
    describe('when is connected', () => {
      beforeEach(() => {
        client['client'] = { test: true } as any;
      });
      it('should not call "createClient"', () => {
        expect(createClientStub.called).to.be.false;
      });
      it('should not call "handleError"', () => {
        expect(handleErrorsSpy.called).to.be.false;
      });
      it('should not call "connect$"', () => {
        expect(connect$Stub.called).to.be.false;
      });
    });
  });

  describe('mergeDisconnectEvent', () => {
    it('should merge disconnect event', () => {
      const error = new Error();
      const instance: any = {
        on: (ev, callback) => callback(error),
        off: () => ({}),
      };
      client
        .mergeDisconnectEvent(instance as any, empty())
        .subscribe(null, err => expect(err).to.be.eql(error));
    });
  });

  describe('publish', () => {
    const pattern = 'test';
    const msg = { pattern, data: 'data' };
    let connectSpy: sinon.SinonSpy,
      sendToQueueSpy: sinon.SinonSpy,
      eventSpy: sinon.SinonSpy;

    beforeEach(() => {
      connectSpy = sinon.spy(client, 'connect');
      eventSpy = sinon.spy();
      sendToQueueSpy = sinon.spy();

      (client as any).client = {};
      (client as any).channel = {
        sendToQueue: sendToQueueSpy,
      };
      (client as any).responseEmitter = new EventEmitter();
      (client as any).responseEmitter.on('test', eventSpy);
    });

    afterEach(() => {
      connectSpy.restore();
    });

    it('should send message', () => {
      client['publish'](msg, () => {
        expect(sendToQueueSpy.called).to.be.true;
      });
    });
  });

  describe('handleMessage', () => {
    const msg: any = {};
    let callbackSpy: sinon.SinonSpy;
    let deleteQueueSpy: sinon.SinonSpy;
    let callback = data => {};

    beforeEach(() => {
      callbackSpy = sinon.spy();
      deleteQueueSpy = sinon.spy();
      (client as any).channel = { deleteQueue: deleteQueueSpy };
      callback = callbackSpy;
    });

    it('should callback if no error or isDisposed', () => {
      msg.content = JSON.stringify({
        err: null,
        response: 'test',
        isDisposed: false,
      });
      client.handleMessage(msg, callback);
      expect(callbackSpy.called).to.be.true;
    });

    it('should callback if error', () => {
      msg.content = JSON.stringify({
        err: true,
        response: 'test',
        isDisposed: false,
      });
      client.handleMessage(msg, callback);
      expect(callbackSpy.called).to.be.true;
    });

    it('should callback if isDisposed', () => {
      msg.content = JSON.stringify({
        err: null,
        response: 'test',
        isDisposed: true,
      });
      client.handleMessage(msg, callback);
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
