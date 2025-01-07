import { expect } from 'chai';
import * as sinon from 'sinon';
import { ClientRedis } from '../../client/client-redis';
import { RedisEventsMap } from '../../events/redis.events';

describe('ClientRedis', () => {
  const test = 'test';
  const client = new ClientRedis({});
  const untypedClient = client as any;

  describe('getRequestPattern', () => {
    it(`should leave pattern as it is`, () => {
      const expectedResult = test;
      expect(client.getRequestPattern(test)).to.equal(expectedResult);
    });
  });
  describe('getReplyPattern', () => {
    it(`should append ".reply" to string`, () => {
      const expectedResult = test + '.reply';
      expect(client.getReplyPattern(test)).to.equal(expectedResult);
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
      connectSpy: sinon.SinonSpy,
      sub: Record<string, Function>,
      pub: Record<string, Function>;

    beforeEach(() => {
      subscribeSpy = sinon.spy((name, fn) => fn());
      publishSpy = sinon.spy();
      onSpy = sinon.spy();
      removeListenerSpy = sinon.spy();
      unsubscribeSpy = sinon.spy();

      sub = {
        subscribe: subscribeSpy,
        on: (type, handler) => (type === 'subscribe' ? handler() : onSpy()),
        removeListener: removeListenerSpy,
        unsubscribe: unsubscribeSpy,
      };
      pub = { publish: publishSpy };
      untypedClient.subClient = sub;
      untypedClient.pubClient = pub;
      connectSpy = sinon.spy(client, 'connect');
    });
    afterEach(() => {
      connectSpy.restore();
    });
    it('should subscribe to response pattern name', () => {
      client['publish'](msg, () => {});
      expect(subscribeSpy.calledWith(`${pattern}.reply`)).to.be.true;
    });
    it('should publish stringified message to request pattern name', () => {
      client['publish'](msg, () => {});
      expect(publishSpy.calledWith(pattern, JSON.stringify(msg))).to.be.true;
    });
    describe('on error', () => {
      let assignPacketIdStub: sinon.SinonStub;
      beforeEach(() => {
        assignPacketIdStub = sinon
          .stub(client, 'assignPacketId' as any)
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
      let assignStub: sinon.SinonStub, getReplyPatternStub: sinon.SinonStub;
      let callback: sinon.SinonSpy, subscription;

      const channel = 'channel';
      const id = '1';

      beforeEach(async () => {
        callback = sinon.spy();
        assignStub = sinon
          .stub(client, 'assignPacketId' as any)
          .callsFake(packet => Object.assign(packet as object, { id }));

        getReplyPatternStub = sinon
          .stub(client, 'getReplyPattern')
          .callsFake(() => channel);
        subscription = client['publish'](msg, callback);
        subscription(channel, JSON.stringify({ isDisposed: true, id }));
      });
      afterEach(() => {
        assignStub.restore();
        getReplyPatternStub.restore();
      });

      it('should unsubscribe to response pattern name', () => {
        expect(unsubscribeSpy.calledWith(channel)).to.be.true;
      });
      it('should clean routingMap', () => {
        expect(client['routingMap'].has(id)).to.be.false;
      });
    });
  });
  describe('createResponseCallback', () => {
    let callback: sinon.SinonSpy, subscription; // : ReturnType<typeof client['createResponseCallback']>;
    const responseMessage = {
      response: 'test',
      id: '1',
    };

    describe('not completed', () => {
      beforeEach(async () => {
        callback = sinon.spy();

        subscription = client.createResponseCallback();
        client['routingMap'].set(responseMessage.id, callback);
        await subscription(
          'channel',
          Buffer.from(JSON.stringify(responseMessage)),
        );
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
              isDisposed: responseMessage.response,
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
      beforeEach(() => {
        callback = sinon.spy();
        subscription = client.createResponseCallback();
        subscription('channel', Buffer.from(JSON.stringify(responseMessage)));
      });

      it('should not call callback', () => {
        expect(callback.called).to.be.false;
      });
    });
  });
  describe('close', () => {
    const untypedClient = client as any;

    let pubClose: sinon.SinonSpy;
    let subClose: sinon.SinonSpy;
    let pub: any, sub: any;

    beforeEach(() => {
      pubClose = sinon.spy();
      subClose = sinon.spy();
      pub = { quit: pubClose };
      sub = { quit: subClose };
      untypedClient.pubClient = pub;
      untypedClient.subClient = sub;
    });
    it('should close "pub" when it is not null', () => {
      client.close();
      expect(pubClose.called).to.be.true;
    });
    it('should not close "pub" when it is null', () => {
      untypedClient.pubClient = null;
      client.close();
      expect(pubClose.called).to.be.false;
    });
    it('should close "sub" when it is not null', () => {
      client.close();
      expect(subClose.called).to.be.true;
    });
    it('should not close "sub" when it is null', () => {
      untypedClient.subClient = null;
      client.close();
      expect(subClose.called).to.be.false;
    });
  });
  describe('connect', () => {
    let createClientSpy: sinon.SinonSpy;
    let registerErrorListenerSpy: sinon.SinonSpy;

    beforeEach(async () => {
      createClientSpy = sinon.stub(client, 'createClient').callsFake(
        () =>
          ({
            on: () => null,
            addListener: () => null,
            removeListener: () => null,
            connect: () => Promise.resolve(),
          }) as any,
      );
      registerErrorListenerSpy = sinon.spy(client, 'registerErrorListener');

      await client.connect();
      client['pubClient'] = null;
    });
    afterEach(() => {
      createClientSpy.restore();
      registerErrorListenerSpy.restore();
    });
    it('should call "createClient" twice', () => {
      expect(createClientSpy.calledTwice).to.be.true;
    });
    it('should call "registerErrorListener" twice', () => {
      expect(registerErrorListenerSpy.calledTwice).to.be.true;
    });
  });
  describe('registerErrorListener', () => {
    it('should bind error event handler', () => {
      const callback = sinon.stub().callsFake((_, fn) => fn({ code: 'test' }));
      const emitter = {
        addListener: callback,
      };
      client.registerErrorListener(emitter as any);
      expect(callback.getCall(0).args[0]).to.be.eql(RedisEventsMap.ERROR);
    });
  });
  describe('registerEndListener', () => {
    it('should bind end event handler', () => {
      const callback = sinon.stub().callsFake((_, fn) => fn({ code: 'test' }));
      const emitter = {
        on: callback,
      };
      client.registerEndListener(emitter as any);
      expect(callback.getCall(0).args[0]).to.be.eql(RedisEventsMap.END);
    });
  });
  describe('registerReadyListener', () => {
    it('should bind ready event handler', () => {
      const callback = sinon.stub().callsFake((_, fn) => fn({ code: 'test' }));
      const emitter = {
        on: callback,
      };
      client.registerReadyListener(emitter as any);
      expect(callback.getCall(0).args[0]).to.be.eql(RedisEventsMap.READY);
    });
  });
  describe('registerReconnectListener', () => {
    it('should bind reconnect event handler', () => {
      const callback = sinon.stub().callsFake((_, fn) => fn({ code: 'test' }));
      const emitter = {
        on: callback,
      };
      client.registerReconnectListener(emitter as any);
      expect(callback.getCall(0).args[0]).to.be.eql(
        RedisEventsMap.RECONNECTING,
      );
    });
  });
  describe('getClientOptions', () => {
    it('should return options object with "retryStrategy" and call "createRetryStrategy"', () => {
      const createSpy = sinon.spy(client, 'createRetryStrategy');
      const { retryStrategy } = client.getClientOptions()!;
      try {
        retryStrategy!({} as any);
      } catch {
        // No empty
      }
      expect(createSpy.called).to.be.true;
    });
  });
  describe('createRetryStrategy', () => {
    describe('when is terminated', () => {
      it('should return undefined', () => {
        untypedClient.isManuallyClosed = true;
        const result = client.createRetryStrategy(0);
        expect(result).to.be.undefined;
      });
    });
    describe('when "retryAttempts" does not exist', () => {
      it('should return undefined', () => {
        untypedClient.isManuallyClosed = false;
        untypedClient.options.options = {};
        untypedClient.options.options.retryAttempts = undefined;
        const result = client.createRetryStrategy(1);
        expect(result).to.be.undefined;
      });
    });
    describe('when "attempts" count is max', () => {
      it('should return undefined', () => {
        untypedClient.isManuallyClosed = false;
        untypedClient.options.options = {};
        untypedClient.options.options.retryAttempts = 3;
        const result = client.createRetryStrategy(4);
        expect(result).to.be.undefined;
      });
    });
    describe('otherwise', () => {
      it('should return delay (ms)', () => {
        untypedClient.options = {};
        untypedClient.isManuallyClosed = false;
        untypedClient.options.retryAttempts = 3;
        untypedClient.options.retryDelay = 3;
        const result = client.createRetryStrategy(2);
        expect(result).to.be.eql(untypedClient.options.retryDelay);
      });
    });
  });
  describe('dispatchEvent', () => {
    const msg = { pattern: 'pattern', data: 'data' };
    let publishStub: sinon.SinonStub, pubClient;

    beforeEach(() => {
      publishStub = sinon.stub();
      pubClient = {
        publish: publishStub,
      };
      untypedClient.pubClient = pubClient;
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
