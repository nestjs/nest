import { expect } from 'chai';
import { empty } from 'rxjs';
import * as sinon from 'sinon';
import { ClientMqtt } from '../../client/client-mqtt';
import { ERROR_EVENT } from '../../constants';

describe('ClientMqtt', () => {
  const test = 'test';
  const client = new ClientMqtt({});

  describe('getRequestPattern', () => {
    it(`should leave pattern as it is`, () => {
      expect(client.getRequestPattern(test)).to.equal(test);
    });
  });
  describe('getResponsePattern', () => {
    it(`should append "/reply" to string`, () => {
      const expectedResult = test + '/reply';
      expect(client.getResponsePattern(test)).to.equal(expectedResult);
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
      assignStub: sinon.SinonStub,
      mqttClient;

    const id = '1';
    beforeEach(() => {
      subscribeSpy = sinon.spy((name, fn) => fn());
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
      assignStub = sinon
        .stub(client, 'assignPacketId' as any)
        .callsFake(packet => Object.assign(packet, { id }));
    });
    afterEach(() => {
      connectSpy.restore();
      assignStub.restore();
    });
    it('should subscribe to response pattern name', async () => {
      await client['publish'](msg, () => {});
      expect(subscribeSpy.calledWith(`${pattern}/reply`)).to.be.true;
    });
    it('should publish stringified message to request pattern name', async () => {
      await client['publish'](msg, () => {});
      expect(publishSpy.calledWith(pattern, JSON.stringify(msg))).to.be.true;
    });
    it('should add callback to routing map', async () => {
      await client['publish'](msg, () => {});
      expect(client['routingMap'].has(id)).to.be.true;
    });
    describe('on error', () => {
      beforeEach(() => {
        assignStub.callsFake(() => {
          throw new Error();
        });
      });

      it('should call callback', () => {
        const callback = sinon.spy();
        client['publish'](msg, callback);

        expect(callback.called).to.be.true;
        expect(callback.getCall(0).args[0].err).to.be.instanceof(Error);
      });
    });
    describe('dispose callback', () => {
      let getResponsePatternStub: sinon.SinonStub;
      let callback: sinon.SinonSpy, subscription;

      const channel = 'channel';

      beforeEach(async () => {
        callback = sinon.spy();

        getResponsePatternStub = sinon
          .stub(client, 'getResponsePattern')
          .callsFake(() => channel);
        subscription = await client['publish'](msg, callback);
        subscription(channel, JSON.stringify({ isDisposed: true, id }));
      });
      afterEach(() => {
        getResponsePatternStub.restore();
      });

      it('should unsubscribe to response pattern name', () => {
        expect(unsubscribeSpy.calledWith(channel)).to.be.true;
      });
      it('should remove callback from routin map', () => {
        expect(client['routingMap'].has(id)).to.be.false;
      });
    });
  });
  describe('createResponseCallback', () => {
    let callback: sinon.SinonSpy, subscription;
    const responseMessage = {
      response: 'test',
      id: '1',
    };

    describe('not completed', () => {
      beforeEach(async () => {
        callback = sinon.spy();
        subscription = client.createResponseCallback();

        client['routingMap'].set(responseMessage.id, callback);
        subscription('channel', Buffer.from(JSON.stringify(responseMessage)));
      });
      it('should call callback with expected arguments', () => {
        expect(
          callback.calledWith({
            err: undefined,
            response: responseMessage.response,
          }),
        ).to.be.true;
      });
    });
    describe('disposed and "id" is correct', () => {
      beforeEach(async () => {
        callback = sinon.spy();
        subscription = client.createResponseCallback();

        client['routingMap'].set(responseMessage.id, callback);
        subscription(
          'channel',
          Buffer.from(
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
            response: responseMessage.response,
            err: undefined,
          }),
        ).to.be.true;
      });
    });
    describe('disposed and "id" is incorrect', () => {
      beforeEach(async () => {
        callback = sinon.spy();
        subscription = client.createResponseCallback();

        client['routingMap'].set('3', callback);
        subscription('channel', Buffer.from(JSON.stringify(responseMessage)));
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
    let mergeCloseEvent: sinon.SinonStub;

    beforeEach(async () => {
      createClientStub = sinon.stub(client, 'createClient').callsFake(
        () =>
          ({
            addListener: () => ({}),
            removeListener: () => ({}),
          } as any),
      );
      handleErrorsSpy = sinon.spy(client, 'handleError');
      connect$Stub = sinon.stub(client, 'connect$' as any).callsFake(() => ({
        subscribe: ({ complete }) => complete(),
        pipe() {
          return this;
        },
      }));
      mergeCloseEvent = sinon
        .stub(client, 'mergeCloseEvent')
        .callsFake((_, source) => source);
    });
    afterEach(() => {
      createClientStub.restore();
      handleErrorsSpy.restore();
      connect$Stub.restore();
      mergeCloseEvent.restore();
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
  describe('mergeCloseEvent', () => {
    it('should merge close event', () => {
      const error = new Error();
      const instance: any = {
        on: (ev, callback) => callback(error),
        off: () => ({}),
      };
      client
        .mergeCloseEvent(instance as any, empty())
        .subscribe(null, (err: any) => expect(err).to.be.eql(error));
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
  describe('dispatchEvent', () => {
    const msg = { pattern: 'pattern', data: 'data' };
    let publishStub: sinon.SinonStub, mqttClient;

    beforeEach(() => {
      publishStub = sinon.stub();
      mqttClient = {
        publish: publishStub,
      };
      (client as any).mqttClient = mqttClient;
    });

    it('should publish packet', async () => {
      publishStub.callsFake((a, b, c) => c());
      await client['dispatchEvent'](msg);

      expect(publishStub.called).to.be.true;
    });
    it('should throw error', async () => {
      publishStub.callsFake((a, b, c) => c(new Error()));
      client['dispatchEvent'](msg).catch(err =>
        expect(err).to.be.instanceOf(Error),
      );
    });
  });
});
