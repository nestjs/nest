import { expect } from 'chai';
import * as sinon from 'sinon';
import { ClientMqtt } from '../../client/client-mqtt';
import { ERROR_EVENT } from '../../constants';
// tslint:disable:no-string-literal

describe('ClientMqtt', () => {
  const test = 'test';
  const client = new ClientMqtt({});

  describe('getAckPatternName', () => {
    it(`should append _ack to string`, () => {
      const expectedResult = test + '_ack';
      expect(client.getAckPatternName(test)).to.equal(expectedResult);
    });
  });
  describe('getResPatternName', () => {
    it(`should append _res to string`, () => {
      const expectedResult = test + '_res';
      expect(client.getResPatternName(test)).to.equal(expectedResult);
    });
  });
  describe('publish', () => {
    const pattern = 'test';
    const msg = { pattern, data: 'data' };
    let subscribeSpy: sinon.SinonSpy,
      publishSpy: sinon.SinonSpy,
      onSpy: sinon.SinonSpy,
      removeListenerSpy: sinon.SinonSpy,
      unsubscribeSpy: sinon.SinonSpy,
      connectSpy: sinon.SinonStub,
      mqttClient;

    beforeEach(() => {
      subscribeSpy = sinon.spy();
      publishSpy = sinon.spy();
      onSpy = sinon.spy();
      removeListenerSpy = sinon.spy();
      unsubscribeSpy = sinon.spy();

      mqttClient = {
        subscribe: subscribeSpy,
        on: (type, handler) => (type === 'subscribe' ? handler() : onSpy()),
        removeListener: removeListenerSpy,
        unsubscribe: unsubscribeSpy,
        publish: publishSpy,
        addListener: () => ({}),
      };
      (client as any).mqttClient = mqttClient;
      connectSpy = sinon.stub(client, 'connect');
    });
    afterEach(() => {
      connectSpy.restore();
    });
    it('should subscribe to response pattern name', async () => {
      await client['publish'](msg, () => {});
      expect(subscribeSpy.calledWith(`${pattern}_res`)).to.be.true;
    });
    it('should publish stringified message to acknowledge pattern name', async () => {
      await client['publish'](msg, () => {});
      expect(publishSpy.calledWith(`${pattern}_ack`, JSON.stringify(msg))).to.be
        .true;
    });
    it('should listen on messages', async () => {
      await client['publish'](msg, () => {});
      expect(onSpy.called).to.be.true;
    });
    describe('on error', () => {
      let assignPacketIdStub: sinon.SinonStub;
      beforeEach(() => {
        assignPacketIdStub = sinon
          .stub(client, 'assignPacketId')
          .callsFake(() => {
            throw new Error();
          });
      });
      afterEach(() => {
        assignPacketIdStub.restore();
      });

      it('should call callback', () => {
        const callback = sinon.spy();
        client['publish'](msg, callback);

        expect(callback.called).to.be.true;
        expect(callback.getCall(0).args[0].err).to.be.instanceof(Error);
      });
    });
    describe('dispose callback', () => {
      let assignStub: sinon.SinonStub, getResPatternStub: sinon.SinonStub;
      let callback: sinon.SinonSpy, subscription;

      const channel = 'channel';
      const id = '1';

      beforeEach(async () => {
        callback = sinon.spy();
        assignStub = sinon
          .stub(client, 'assignPacketId')
          .callsFake(packet => Object.assign(packet, { id }));

        getResPatternStub = sinon
          .stub(client, 'getResPatternName')
          .callsFake(() => channel);
        subscription = await client['publish'](msg, callback);
        subscription(channel, JSON.stringify({ isDisposed: true, id }));
      });
      afterEach(() => {
        assignStub.restore();
        getResPatternStub.restore();
      });

      it('should unsubscribe to response pattern name', () => {
        expect(unsubscribeSpy.calledWith(channel)).to.be.true;
      });
      it('should remove listener', () => {
        expect(removeListenerSpy.called).to.be.true;
      });
    });
  });
  describe('createResponseCallback', () => {
    const pattern = 'test';
    const msg = { pattern, data: 'data', id: '1' };
    let callback: sinon.SinonSpy, subscription;
    const responseMessage = {
      err: null,
      response: 'test',
      id: '1',
    };

    describe('not completed', () => {
      beforeEach(async () => {
        callback = sinon.spy();

        subscription = client.createResponseCallback(msg, callback);
        subscription('channel', new Buffer(JSON.stringify(responseMessage)));
      });
      it('should call callback with expected arguments', () => {
        expect(
          callback.calledWith({
            err: null,
            response: responseMessage.response,
          }),
        ).to.be.true;
      });
    });
    describe('disposed and "id" is correct', () => {
      beforeEach(async () => {
        callback = sinon.spy();
        subscription = client.createResponseCallback(msg, callback);
        subscription(
          'channel',
          new Buffer(
            JSON.stringify({
              ...responseMessage,
              isDisposed: true,
            }),
          ),
        );
      });

      it('should call callback with dispose param', () => {
        expect(callback.called).to.be.true;
        expect(
          callback.calledWith({
            isDisposed: true,
            response: null,
            err: null,
          }),
        ).to.be.true;
      });
    });
    describe('disposed and "id" is incorrect', () => {
      beforeEach(async () => {
        callback = sinon.spy();
        subscription = client.createResponseCallback(
          {
            ...msg,
            id: '2',
          },
          callback,
        );
        subscription('channel', new Buffer(JSON.stringify(responseMessage)));
      });

      it('should not call callback', () => {
        expect(callback.called).to.be.false;
      });
    });
  });
  describe('close', () => {
    let endSpy: sinon.SinonSpy;
    beforeEach(() => {
      endSpy = sinon.spy();
      (client as any).mqttClient = { end: endSpy };
    });
    it('should close "pub" when it is not null', () => {
      client.close();
      expect(endSpy.called).to.be.true;
    });
    it('should not close "pub" when it is null', () => {
      (client as any).mqttClient = null;
      client.close();
      expect(endSpy.called).to.be.false;
    });
  });
  describe('connect', () => {
    let createClientStub: sinon.SinonStub;
    let handleErrorsSpy: sinon.SinonSpy;
    let connect$Stub: sinon.SinonStub;

    beforeEach(async () => {
      createClientStub = sinon.stub(client, 'createClient').callsFake(() => ({
        addListener: () => ({}),
        removeListener: () => ({}),
      }));
      handleErrorsSpy = sinon.spy(client, 'handleError');
      connect$Stub = sinon.stub(client, 'connect$').callsFake(() => ({
        subscribe: resolve => resolve(),
        toPromise: () => this,
      }));
    });
    afterEach(() => {
      createClientStub.restore();
      handleErrorsSpy.restore();
      connect$Stub.restore();
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
        client['mqttClient'] = { test: true } as any;
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
  describe('handleError', () => {
    it('should bind error event handler', () => {
      const callback = sinon.stub().callsFake((_, fn) => fn({ code: 'test' }));
      const emitter = {
        addListener: callback,
      };
      client.handleError(emitter as any);
      expect(callback.getCall(0).args[0]).to.be.eql(ERROR_EVENT);
    });
  });
});
