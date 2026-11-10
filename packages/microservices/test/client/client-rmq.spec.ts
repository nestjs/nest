import { expect } from 'chai';
import { EventEmitter } from 'events';
import { EMPTY, firstValueFrom } from 'rxjs';
import * as sinon from 'sinon';
import { ClientRMQ } from '../../client/client-rmq';
import { RQM_DEFAULT_MAX_MESSAGE_SIZE } from '../../constants';
import { MaxPacketLengthExceededException } from '../../errors/max-packet-length-exceeded.exception';
import { MaxRmqShortStringLengthExceededException } from '../../errors/max-rmq-short-string-length-exceeded.exception';
import { ReadPacket, WritePacket } from '../../interfaces';
import { RmqRecord } from '../../record-builders';

describe('ClientRMQ', function () {
  this.retries(10);

  let client: ClientRMQ;
  let untypedClient: any;

  describe('connect', () => {
    let createClientStub: sinon.SinonStub;
    let registerErrorListenerSpy: sinon.SinonSpy;
    let registerBlockedListenerSpy: sinon.SinonSpy;
    let registerUnblockedListenerSpy: sinon.SinonSpy;
    let connect$Stub: sinon.SinonStub;

    beforeEach(async () => {
      client = new ClientRMQ({});
      untypedClient = client as any;

      createClientStub = sinon.stub(client, 'createClient').callsFake(() => ({
        addListener: () => ({}),
        removeListener: () => ({}),
      }));
      registerErrorListenerSpy = sinon.spy(client, 'registerErrorListener');
      registerBlockedListenerSpy = sinon.spy(client, 'registerBlockedListener');
      registerUnblockedListenerSpy = sinon.spy(
        client,
        'registerUnblockedListener',
      );
      connect$Stub = sinon.stub(client, 'connect$' as any).callsFake(() => ({
        subscribe: resolve => resolve(),
        toPromise() {
          return this;
        },
        pipe() {
          return this;
        },
      }));
      sinon
        .stub(client, 'mergeDisconnectEvent')
        .callsFake((_, source) => source);
    });
    describe('when is not connected', () => {
      beforeEach(async () => {
        try {
          client['client'] = null;
          await client.connect();
        } catch {
          // Ignore
        }
      });
      it('should call "registerErrorListener" once', async () => {
        expect(registerErrorListenerSpy.called).to.be.true;
      });
      it('should call "registerBlockedListener" once', async () => {
        expect(registerBlockedListenerSpy.called).to.be.true;
      });
      it('should call "registerUnblockedListener" once', async () => {
        expect(registerUnblockedListenerSpy.called).to.be.true;
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
        client['channel'] = { test: true };
      });
      it('should not call "createClient"', () => {
        expect(createClientStub.called).to.be.false;
      });
      it('should not call "registerErrorListener"', () => {
        expect(registerErrorListenerSpy.called).to.be.false;
      });
      it('should not call "registerBlockedListener"', () => {
        expect(registerBlockedListenerSpy.called).to.be.false;
      });
      it('should not call "registerUnblockedListener"', () => {
        expect(registerUnblockedListenerSpy.called).to.be.false;
      });
      it('should not call "connect$"', () => {
        expect(connect$Stub.called).to.be.false;
      });
    });
  });

  describe('registerBlockedListener', () => {
    it('should register a "blocked" listener and push RmqStatus.BLOCKED on fire', () => {
      client = new ClientRMQ({});
      untypedClient = client as any;

      const addListener = sinon.stub();
      const fakeClient: any = { addListener };

      const statusValues: string[] = [];
      untypedClient._status$.subscribe((s: string) => statusValues.push(s));

      client.registerBlockedListener(fakeClient);
      expect(addListener.calledOnce).to.be.true;
      expect(addListener.getCall(0).args[0]).to.be.equal('blocked');

      const registeredCallback = addListener.getCall(0).args[1];
      registeredCallback({ reason: 'low memory' });

      expect(statusValues[statusValues.length - 1]).to.be.equal('blocked');
    });
  });

  describe('registerUnblockedListener', () => {
    it('should register an "unblocked" listener and push RmqStatus.UNBLOCKED on fire', () => {
      client = new ClientRMQ({});
      untypedClient = client as any;

      const addListener = sinon.stub();
      const fakeClient: any = { addListener };

      const statusValues: string[] = [];
      untypedClient._status$.subscribe((s: string) => statusValues.push(s));

      client.registerUnblockedListener(fakeClient);
      expect(addListener.calledOnce).to.be.true;
      expect(addListener.getCall(0).args[0]).to.be.equal('unblocked');

      const registeredCallback = addListener.getCall(0).args[1];
      registeredCallback();

      expect(statusValues[statusValues.length - 1]).to.be.equal('unblocked');
    });
  });

  describe('createChannel', () => {
    let createChannelStub: sinon.SinonStub;
    let setupChannelStub: sinon.SinonStub;

    beforeEach(() => {
      setupChannelStub = sinon
        .stub(client, 'setupChannel')
        .callsFake((_, done) => done());
      createChannelStub = sinon.stub().callsFake(({ setup }) => setup());
      client['client'] = { createChannel: createChannelStub };
    });
    afterEach(() => {
      setupChannelStub.restore();
    });
    it('should call "createChannel" method of the client instance', async () => {
      await client.createChannel();
      expect(createChannelStub.called).to.be.true;
    });
    it('should call "setupChannel" method of the client instance', async () => {
      await client.createChannel();
      expect(setupChannelStub.called).to.be.true;
    });
  });

  describe('consumeChannel', () => {
    let consumeStub: sinon.SinonStub;
    const channel: any = {};

    beforeEach(() => {
      client['responseEmitter'] = new EventEmitter();
      consumeStub = sinon
        .stub()
        .callsFake((_, done) => done({ properties: { correlationId: 1 } }));

      channel.consume = consumeStub;
    });
    it('should call "consume" method of the channel instance', async () => {
      await client.consumeChannel(channel);
      expect(consumeStub.called).to.be.true;
    });

    describe('when a reply arrives', () => {
      let responseEmitter: EventEmitter;
      let emitSpy: sinon.SinonSpy;
      let onMessage: (msg: any) => void;

      beforeEach(async () => {
        responseEmitter = new EventEmitter();
        client['responseEmitter'] = responseEmitter;
        emitSpy = sinon.spy(responseEmitter, 'emit');
        channel.consume = sinon.stub().resolves();
        await client.consumeChannel(channel);
        onMessage = channel.consume.firstCall.args[1];
      });

      it('should forward a message to the request waiting for it', () => {
        const msg = { properties: { correlationId: 'id' }, content: 'content' };
        const listener = sinon.spy();
        responseEmitter.on(msg.properties.correlationId, listener);

        onMessage(msg);

        expect(emitSpy.calledOnceWith(msg.properties.correlationId, msg)).to.be
          .true;
        expect(listener.calledWith(msg)).to.be.true;
      });

      it('should not throw when the broker cancels the consumer', () => {
        expect(() => onMessage(null)).to.not.throw();
        expect(emitSpy.called).to.be.false;
      });

      it('should consume the reply queue again after a cancel', () => {
        expect(channel.consume.callCount).to.equal(1);

        onMessage(null);

        expect(channel.consume.callCount).to.equal(2);
      });

      it('should ignore a message no request waits for', () => {
        const msg = {
          properties: { correlationId: 'unknown' },
          content: 'content',
        };

        onMessage(msg);

        expect(emitSpy.called).to.be.false;
      });

      it('should not throw on a message whose correlation id is "error"', () => {
        // Whoever publishes to the reply queue chooses the correlation id, and
        // an "error" event without a listener throws inside amqplib's dispatch,
        // which closes the channel and the connection
        const msg = {
          properties: { correlationId: 'error' },
          content: 'content',
        };

        expect(() => onMessage(msg)).to.not.throw();
        expect(emitSpy.called).to.be.false;
      });
    });
  });

  describe('setupChannel', () => {
    const queue = 'test';
    const exchange = 'test.exchange';
    const queueOptions = {};
    const isGlobalPrefetchCount = true;
    const prefetchCount = 10;

    let consumeStub: sinon.SinonStub;
    let channel: any = {};

    beforeEach(() => {
      client['queue'] = queue;
      client['queueOptions'] = queueOptions;
      untypedClient['options'] = { isGlobalPrefetchCount, prefetchCount };

      channel = {
        assertQueue: sinon.spy(() => ({})),
        prefetch: sinon.spy(),
        bindQueue: sinon.spy(),
        assertExchange: sinon.spy(),
      };
      consumeStub = sinon.stub(client, 'consumeChannel').callsFake(() => null!);
    });
    afterEach(() => {
      consumeStub.restore();
    });
    it('should call "assertQueue" with queue and queue options when noAssert is false', async () => {
      client['noAssert'] = false;

      await client.setupChannel(channel, () => null);
      expect(channel.assertQueue.calledWith(queue, queueOptions)).to.be.true;
    });
    it('should not call "assertQueue" when noAssert is true', async () => {
      client['noAssert'] = true;

      await client.setupChannel(channel, () => null);
      expect(channel.assertQueue.called).not.to.be.true;
    });
    it('should not call "assertQueue" when exchangeType is fanout', async () => {
      untypedClient['options']['exchangeType'] = 'fanout';
      untypedClient['options']['exchange'] = exchange;
      await client.setupChannel(channel, () => null);
      expect(channel.assertQueue.called).not.to.be.true;
    });
    it('should not call "assertQueue" when wildcards is true', async () => {
      untypedClient['options']['wildcards'] = true;
      await client.setupChannel(channel, () => null);
      expect(channel.assertQueue.called).not.to.be.true;
    });
    it('should not call "bindQueue" when exchangeType is fanout', async () => {
      untypedClient['options']['exchangeType'] = 'fanout';
      untypedClient['options']['exchange'] = exchange;
      await client.setupChannel(channel, () => null);
      expect(channel.bindQueue.called).not.to.be.true;
    });
    it('should not call "bindQueue" when wildcards is true', async () => {
      untypedClient['options']['wildcards'] = true;
      await client.setupChannel(channel, () => null);
      expect(channel.bindQueue.called).not.to.be.true;
    });
    it('should call "prefetch" with prefetchCount and "isGlobalPrefetchCount"', async () => {
      await client.setupChannel(channel, () => null);
      expect(channel.prefetch.calledWith(prefetchCount, isGlobalPrefetchCount))
        .to.be.true;
    });
    it('should call "consumeChannel" method', async () => {
      await client.setupChannel(channel, () => null);
      expect(consumeStub.called).to.be.true;
    });
    it('should call "resolve" function', async () => {
      const resolve = sinon.spy();
      await client.setupChannel(channel, resolve);
      expect(resolve.called).to.be.true;
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
        .mergeDisconnectEvent(instance, EMPTY)
        .subscribe({ error: (err: any) => expect(err).to.be.eql(error) });
    });
  });

  describe('publish', () => {
    const pattern = 'test';
    const exchange = 'test.exchange';
    let msg: ReadPacket;
    let connectSpy: sinon.SinonSpy,
      sendToQueueStub: sinon.SinonStub,
      publishStub: sinon.SinonStub,
      eventSpy: sinon.SinonSpy;

    beforeEach(() => {
      client = new ClientRMQ({});
      untypedClient = client as any;

      msg = { pattern, data: 'data' };
      connectSpy = sinon.spy(client, 'connect');
      eventSpy = sinon.spy();
      sendToQueueStub = sinon.stub().callsFake(() => ({ catch: sinon.spy() }));
      publishStub = sinon.stub().callsFake(() => ({ catch: sinon.spy() }));

      client['channel'] = {
        sendToQueue: sendToQueueStub,
        publish: publishStub,
      };
      client['responseEmitter'] = new EventEmitter();
      client['responseEmitter'].on(pattern, eventSpy);
    });

    afterEach(() => {
      connectSpy.restore();
    });

    it('should send message to a proper queue', () => {
      client['publish'](msg, () => {
        expect(sendToQueueStub.called).to.be.true;
        expect(sendToQueueStub.getCall(0).args[0]).to.be.eql(client['queue']);
      });
    });
    it('should send message to exchange when exchangeType is fanout', async () => {
      untypedClient['options']['exchangeType'] = 'fanout';
      untypedClient['options']['exchange'] = exchange;
      client['publish'](msg, () => {
        expect(publishStub.called).to.be.true;
        expect(publishStub.getCall(0).args[0]).to.be.eql(exchange);
      });
    });
    it('should publish with the routing key the server binds when wildcards is true', () => {
      untypedClient['options']['wildcards'] = true;
      // The server binds its queue with the normalized pattern (sorted keys)
      client['publish'](
        { pattern: { role: 'user', cmd: 'create' }, data: 'data' },
        () => {},
      );

      expect(publishStub.firstCall.args[1]).to.equal(
        '{"cmd":"create","role":"user"}',
      );
    });

    it('should send buffer from stringified message', () => {
      client['publish'](msg, () => {
        expect(sendToQueueStub.called).to.be.true;
        expect(sendToQueueStub.getCall(1).args[1]).to.be.eql(
          Buffer.from(JSON.stringify(msg)),
        );
      });
    });

    it('should not derive a correlation id from the ids before it', () => {
      for (let i = 0; i < 3; i++) {
        client['publish']({ pattern, data: 'data' }, () => {});
      }
      const [first, second, third] = sendToQueueStub
        .getCalls()
        .map(call => call.args[2].correlationId as string);

      expect(second.startsWith(first.slice(1))).to.be.false;
      expect(third.startsWith(second.slice(1))).to.be.false;
    });

    describe('when a short string is longer than AMQP allows', () => {
      // An AMQP short string has at most 255 bytes
      const longest = 'a'.repeat(255);

      const expectFailedWithoutPublishing = (callback: sinon.SinonSpy) => {
        expect(callback.calledOnce).to.be.true;
        expect(callback.firstCall.args[0]).to.have.keys('err');
        expect(callback.firstCall.args[0].err).to.be.instanceOf(
          MaxRmqShortStringLengthExceededException,
        );
        expect(publishStub.called).to.be.false;
        expect(sendToQueueStub.called).to.be.false;
        // Only the listener registered by "beforeEach" is left
        expect(client['responseEmitter'].eventNames()).to.deep.equal([pattern]);
      };

      [
        ['wildcards', { wildcards: true }],
        ['a fanout exchange', { exchangeType: 'fanout' }],
      ].forEach(([description, options]) => {
        it(`should fail the request without publishing when the routing key is too long, with ${description as string}`, () => {
          Object.assign(untypedClient['options'], options);
          const callback = sinon.spy();

          client['publish']({ pattern: `${longest}a`, data: 'data' }, callback);

          expectFailedWithoutPublishing(callback);
        });
      });

      it('should count the length of the routing key in bytes', () => {
        untypedClient['options']['wildcards'] = true;
        const callback = sinon.spy();

        // "é" takes two bytes
        client['publish'](
          { pattern: `${longest.slice(1)}é`, data: 'data' },
          callback,
        );

        expectFailedWithoutPublishing(callback);
      });

      it('should check the normalized form of an object pattern', () => {
        untypedClient['options']['wildcards'] = true;
        const callback = sinon.spy();

        client['publish'](
          { pattern: { cmd: longest }, data: 'data' },
          callback,
        );

        expectFailedWithoutPublishing(callback);
      });

      it('should publish a request whose routing key has 255 bytes', () => {
        untypedClient['options']['wildcards'] = true;
        const callback = sinon.spy();

        client['publish']({ pattern: longest, data: 'data' }, callback);

        expect(callback.called).to.be.false;
        expect(publishStub.firstCall.args[1]).to.equal(longest);
      });

      it('should send a longer pattern to the queue, in the body', () => {
        const callback = sinon.spy();

        client['publish']({ pattern: `${longest}a`, data: 'data' }, callback);

        expect(callback.called).to.be.false;
        expect(sendToQueueStub.calledOnce).to.be.true;
      });

      ['messageId', 'type', 'appId', 'expiration'].forEach(property => {
        it(`should fail the request without publishing when "${property}" is too long`, () => {
          const callback = sinon.spy();

          client['publish'](
            {
              pattern,
              data: new RmqRecord('data', { [property]: `${longest}a` }),
            },
            callback,
          );

          expectFailedWithoutPublishing(callback);
        });
      });

      it('should fail the request without publishing when a header name is too long', () => {
        const callback = sinon.spy();

        client['publish'](
          {
            pattern,
            data: new RmqRecord('data', {
              headers: { [`${longest}a`]: 'value' },
            }),
          },
          callback,
        );

        expectFailedWithoutPublishing(callback);
      });

      it('should publish properties and header names of 255 bytes', () => {
        const callback = sinon.spy();

        client['publish'](
          {
            pattern,
            data: new RmqRecord('data', {
              messageId: longest,
              headers: { [longest]: 'a'.repeat(1000) },
            }),
          },
          callback,
        );

        expect(callback.called).to.be.false;
        expect(sendToQueueStub.firstCall.args[2].messageId).to.equal(longest);
      });
    });

    describe('dispose callback', () => {
      let unsubscribeSpy: sinon.SinonSpy, subscription;

      beforeEach(async () => {
        unsubscribeSpy = sinon.spy();
        client['responseEmitter'] = {
          removeListener: unsubscribeSpy,
          on: sinon.spy(),
        } as any as EventEmitter;

        subscription = client['publish'](msg, sinon.spy());
        subscription();
      });
      it('should unsubscribe', () => {
        expect(unsubscribeSpy.called).to.be.true;
      });
    });

    describe('headers', () => {
      it('should not generate headers if none are configured', () => {
        client['publish'](msg, () => {
          expect(sendToQueueStub.getCall(0).args[2].headers).to.be.undefined;
        });
      });

      it('should send packet headers', () => {
        const requestHeaders = { '1': '123' };
        msg.data = new RmqRecord('data', { headers: requestHeaders });

        client['publish'](msg, () => {
          expect(sendToQueueStub.getCall(0).args[2].headers).to.eql(
            requestHeaders,
          );
        });
      });

      it('should combine packet and static headers', () => {
        const staticHeaders = { 'client-id': 'some-client-id' };
        untypedClient.options.headers = staticHeaders;

        const requestHeaders = { '1': '123' };
        msg.data = new RmqRecord('data', { headers: requestHeaders });

        client['publish'](msg, () => {
          expect(sendToQueueStub.getCall(0).args[2].headers).to.eql({
            ...staticHeaders,
            ...requestHeaders,
          });
        });
      });

      it('should prefer packet headers over static headers', () => {
        const staticHeaders = { 'client-id': 'some-client-id' };
        untypedClient.options.headers = staticHeaders;

        const requestHeaders = { 'client-id': 'override-client-id' };
        msg.data = new RmqRecord('data', { headers: requestHeaders });

        client['publish'](msg, () => {
          expect(sendToQueueStub.getCall(0).args[2].headers).to.eql(
            requestHeaders,
          );
        });
      });
    });

    describe('when the reply exceeds "maxMessageSize"', () => {
      const maxMessageSize = 16;
      const sendRequest = async (rmqClient: ClientRMQ) => {
        const responseEmitter = new EventEmitter();
        const sendToQueue = sinon
          .stub()
          .callsFake(() => ({ catch: sinon.spy() }));
        Object.assign(rmqClient, {
          responseEmitter,
          channel: { sendToQueue },
        });
        sinon.stub(rmqClient, 'connect').resolves(undefined);

        const response = firstValueFrom(rmqClient.send('test', 'data'));
        while (!sendToQueue.called) {
          await new Promise(resolve => setImmediate(resolve));
        }
        const { correlationId } = sendToQueue.firstCall.args[2];
        const reply = (content: Buffer) =>
          responseEmitter.emit(correlationId, { content, options: {} });
        return { response, reply, responseEmitter, correlationId };
      };

      it('should fail the request without decoding the reply', async () => {
        const rmqClient = new ClientRMQ({ maxMessageSize });
        const { response, reply, responseEmitter, correlationId } =
          await sendRequest(rmqClient);
        const content = Buffer.from('{"response":"12"}');
        expect(content.length).to.equal(maxMessageSize + 1);
        const toStringSpy = sinon.spy(content, 'toString');

        reply(content);

        let error: unknown;
        await response.catch(err => (error = err));
        expect(error).to.be.instanceOf(MaxPacketLengthExceededException);
        expect(toStringSpy.called).to.be.false;
        expect(responseEmitter.listenerCount(correlationId)).to.equal(0);
      });

      it('should pass on a reply of exactly "maxMessageSize" bytes', async () => {
        const rmqClient = new ClientRMQ({ maxMessageSize });
        const { response, reply } = await sendRequest(rmqClient);
        const content = Buffer.from('{"response":"1"}');
        expect(content.length).to.equal(maxMessageSize);

        reply(content);

        expect(await response).to.equal('1');
      });

      it('should default to 16 MiB', () => {
        expect(RQM_DEFAULT_MAX_MESSAGE_SIZE).to.equal(16 * 1024 * 1024);
        expect(new ClientRMQ({})['maxMessageSize']).to.equal(
          RQM_DEFAULT_MAX_MESSAGE_SIZE,
        );
      });

      (
        [
          ['NaN', NaN],
          ['a string', '16mb'],
        ] as const
      ).forEach(([name, value]) => {
        it(`should use the default for ${name}`, () => {
          expect(
            new ClientRMQ({ maxMessageSize: value as number })[
              'maxMessageSize'
            ],
          ).to.equal(RQM_DEFAULT_MAX_MESSAGE_SIZE);
        });
      });
    });
  });

  describe('handleMessage', () => {
    describe('when error', () => {
      let callback: sinon.SinonSpy;

      beforeEach(() => {
        callback = sinon.spy();
      });
      it('should call callback with correct object', async () => {
        const packet = {
          err: true,
          response: 'test',
          isDisposed: false,
        };
        await client.handleMessage(packet, callback);
        expect(
          callback.calledWith({
            err: packet.err,
            response: 'test',
            isDisposed: true,
          }),
        ).to.be.true;
      });
    });
    describe('when disposed', () => {
      let callback: sinon.SinonSpy;

      beforeEach(() => {
        callback = sinon.spy();
      });
      it('should call callback with correct object', async () => {
        const packet = {
          response: 'test',
          isDisposed: true,
        };
        await client.handleMessage(packet, callback);
        expect(
          callback.calledWith({
            err: undefined,
            response: 'test',
            isDisposed: true,
          }),
        ).to.be.true;
      });
    });

    describe('when response', () => {
      let callback: sinon.SinonSpy;

      beforeEach(() => {
        callback = sinon.spy();
      });
      it('should call callback with correct object', async () => {
        const packet = {
          response: 'test',
          isDisposed: false,
        };
        await client.handleMessage(packet, callback);
        expect(
          callback.calledWith({
            err: undefined,
            response: packet.response,
          }),
        ).to.be.true;
      });
    });
  });

  describe('close', () => {
    let channelCloseSpy: sinon.SinonSpy;
    let clientCloseSpy: sinon.SinonSpy;
    beforeEach(() => {
      client = new ClientRMQ({});
      untypedClient = client as any;

      channelCloseSpy = sinon.spy();
      clientCloseSpy = sinon.spy();
      untypedClient.responseEmitter = new EventEmitter();
      untypedClient.channel = {
        close: channelCloseSpy,
        sendToQueue: sinon.stub().callsFake(() => ({ catch: sinon.spy() })),
        publish: sinon.stub().callsFake(() => ({ catch: sinon.spy() })),
      };
      untypedClient.client = { close: clientCloseSpy };
    });

    const publish = (callback: (packet: WritePacket) => any) =>
      untypedClient.publish({ pattern: 'pattern', data: 'data' }, callback);
    const expectConnectionClosed = (callback: sinon.SinonSpy) => {
      expect(callback.calledOnce).to.be.true;
      expect(callback.firstCall.args[0]).to.have.keys('err');
      expect(callback.firstCall.args[0].err.message).to.equal(
        'Connection closed',
      );
    };

    it('should close channel when it is not null', async () => {
      await client.close();
      expect(channelCloseSpy.called).to.be.true;
    });

    it('should close client when it is not null', async () => {
      await client.close();
      expect(clientCloseSpy.called).to.be.true;
    });

    it('should fail pending requests with a connection closed error', async () => {
      const callback = sinon.spy();
      publish(callback);

      await client.close();

      expectConnectionClosed(callback);
    });

    it('should fail pending requests published to an exchange', async () => {
      untypedClient.options.wildcards = true;
      const publishToExchange = untypedClient.channel.publish;
      const callback = sinon.spy();
      publish(callback);

      await client.close();

      expect(publishToExchange.called).to.be.true;
      expectConnectionClosed(callback);
    });

    it('should not call back a request whose teardown already ran', async () => {
      const callback = sinon.spy();
      const teardown = publish(callback);

      teardown();
      await client.close();

      expect(callback.called).to.be.false;
      expect(untypedClient.responseEmitter.eventNames()).to.have.lengthOf(0);
    });

    it('should leave nothing pending behind', async () => {
      const callback = sinon.spy();
      publish(callback);

      await client.close();
      await client.close();

      expect(callback.calledOnce).to.be.true;
      expect(untypedClient.routingMap.size).to.equal(0);
      expect(untypedClient.responseEmitter.eventNames()).to.have.lengthOf(0);
    });

    it('should fail pending requests even when closing the channel rejects', async () => {
      untypedClient.channel.close = sinon
        .stub()
        .rejects(new Error('Channel closing error'));
      const callback = sinon.spy();
      publish(callback);

      let closeError: Error | undefined;
      await client.close().catch(err => (closeError = err));

      expect(closeError?.message).to.equal('Channel closing error');
      expectConnectionClosed(callback);
    });

    it('should fail every pending request and close the channel when a callback throws', async () => {
      sinon.stub(untypedClient.logger, 'error');
      const throwingCallback = sinon.stub().throws(new Error('Callback error'));
      const callback = sinon.spy();
      publish(throwingCallback);
      publish(callback);

      await client.close();

      expect(throwingCallback.calledOnce).to.be.true;
      expectConnectionClosed(callback);
      expect(untypedClient.routingMap.size).to.equal(0);
      expect(untypedClient.responseEmitter.eventNames()).to.have.lengthOf(0);
      expect(channelCloseSpy.called).to.be.true;
    });

    it('should not track a request whose publish threw synchronously', async () => {
      untypedClient.channel.sendToQueue = () => {
        throw new Error('Publish error');
      };
      const callback = sinon.spy();
      publish(callback);

      expect(untypedClient.routingMap.size).to.equal(0);
      expect(untypedClient.responseEmitter.eventNames()).to.have.lengthOf(0);

      await client.close();

      expect(callback.calledOnce).to.be.true;
      expect(callback.firstCall.args[0].err.message).to.equal('Publish error');
    });
  });
  describe('dispatchEvent', () => {
    let msg: ReadPacket;
    const exchange = 'test.exchange';
    let sendToQueueStub: sinon.SinonStub, publishStub: sinon.SinonStub, channel;

    beforeEach(() => {
      client = new ClientRMQ({});
      untypedClient = client as any;

      msg = { pattern: 'pattern', data: 'data' };
      sendToQueueStub = sinon.stub();
      publishStub = sinon.stub();
      channel = {
        sendToQueue: sendToQueueStub,
        publish: publishStub,
      };
      untypedClient.channel = channel;
    });

    it('should publish packet', async () => {
      sendToQueueStub.callsFake((a, b, c, d) => d());
      await client['dispatchEvent'](msg);

      expect(sendToQueueStub.called).to.be.true;
    });
    it('should publish packet to exchange when exchangeType is fanout', async () => {
      untypedClient['options']['exchangeType'] = 'fanout';
      untypedClient['options']['exchange'] = exchange;
      publishStub.callsFake((a, b, c, d, f) => f());
      await client['dispatchEvent'](msg);

      expect(publishStub.called).to.be.true;
      expect(publishStub.getCall(0).args[0]).to.be.eql(exchange);
    });
    it('should publish with the routing key the server binds when wildcards is true', async () => {
      untypedClient['options']['wildcards'] = true;
      publishStub.callsFake((a, b, c, d, f) => f());
      // The server binds its queue with the normalized pattern (sorted keys)
      await client['dispatchEvent']({
        pattern: { role: 'user', cmd: 'create' },
        data: 'data',
      });

      expect(publishStub.firstCall.args[1]).to.equal(
        '{"cmd":"create","role":"user"}',
      );
    });
    it('should throw error', async () => {
      sendToQueueStub.callsFake((a, b, c, d) => d(new Error()));
      client['dispatchEvent'](msg).catch(err =>
        expect(err).to.be.instanceOf(Error),
      );
    });
    it('should not publish an event whose routing key is longer than AMQP allows', async () => {
      untypedClient['options']['wildcards'] = true;

      let error: unknown;
      await client['dispatchEvent']({
        pattern: 'a'.repeat(256),
        data: 'data',
      }).catch(err => (error = err));
      expect(error).to.be.instanceOf(MaxRmqShortStringLengthExceededException);
      expect(publishStub.called).to.be.false;
    });
    it('should not publish an event with a property longer than AMQP allows', async () => {
      let error: unknown;
      await client['dispatchEvent']({
        pattern: 'pattern',
        data: new RmqRecord('data', { type: 'a'.repeat(256) }),
      }).catch(err => (error = err));
      expect(error).to.be.instanceOf(MaxRmqShortStringLengthExceededException);
      expect(sendToQueueStub.called).to.be.false;
    });
    it('should publish an event whose routing key has 255 bytes', async () => {
      untypedClient['options']['wildcards'] = true;
      publishStub.callsFake((a, b, c, d, f) => f());

      await client['dispatchEvent']({ pattern: 'a'.repeat(255), data: 'data' });

      expect(publishStub.firstCall.args[1]).to.equal('a'.repeat(255));
    });

    describe('headers', () => {
      it('should not generate headers if none are configured', async () => {
        sendToQueueStub.callsFake((a, b, c, d) => d());
        await client['dispatchEvent'](msg);
        expect(sendToQueueStub.getCall(0).args[2].headers).to.be.undefined;
      });

      it('should send packet headers', async () => {
        sendToQueueStub.callsFake((a, b, c, d) => d());
        const requestHeaders = { '1': '123' };
        msg.data = new RmqRecord('data', { headers: requestHeaders });

        await client['dispatchEvent'](msg);
        expect(sendToQueueStub.getCall(0).args[2].headers).to.eql(
          requestHeaders,
        );
      });

      it('should combine packet and static headers', async () => {
        sendToQueueStub.callsFake((a, b, c, d) => d());
        const staticHeaders = { 'client-id': 'some-client-id' };
        untypedClient.options.headers = staticHeaders;

        const requestHeaders = { '1': '123' };
        msg.data = new RmqRecord('data', { headers: requestHeaders });

        await client['dispatchEvent'](msg);
        expect(sendToQueueStub.getCall(0).args[2].headers).to.eql({
          ...staticHeaders,
          ...requestHeaders,
        });
      });

      it('should prefer packet headers over static headers', async () => {
        sendToQueueStub.callsFake((a, b, c, d) => d());
        const staticHeaders = { 'client-id': 'some-client-id' };
        untypedClient.options.headers = staticHeaders;

        const requestHeaders = { 'client-id': 'override-client-id' };
        msg.data = new RmqRecord('data', { headers: requestHeaders });

        await client['dispatchEvent'](msg);
        expect(sendToQueueStub.getCall(0).args[2].headers).to.eql(
          requestHeaders,
        );
      });
    });
  });

  describe('when the connection is lost', () => {
    let manager: EventEmitter & { close: sinon.SinonStub };

    const connectClient = async (options = {}) => {
      client = new ClientRMQ(options);
      manager = Object.assign(new EventEmitter(), {
        close: sinon.stub().resolves(),
      });
      sinon.stub(client, 'createClient').returns(manager);
      sinon.stub(client, 'createChannel').resolves();
      sinon.stub(client['logger'], 'log');
      sinon.stub(client['logger'], 'error');
      const connectPromise = client.connect();
      manager.emit('connect');
      await connectPromise;
    };

    it('should fail the pending requests waiting on the direct reply-to queue', async () => {
      await connectClient();
      const callback = sinon.spy();
      client['routingMap'].set('id', callback);

      manager.emit('disconnect', { err: new Error('broker shutdown') });

      expect(callback.calledOnce).to.be.true;
      expect(callback.firstCall.args[0]).to.have.keys('err');
      expect(callback.firstCall.args[0].err.message).to.equal(
        'Connection closed',
      );
      expect(client['routingMap'].size).to.equal(0);
    });

    it('should keep the pending requests waiting on a named reply queue', async () => {
      await connectClient({ replyQueue: 'replies' });
      const callback = sinon.spy();
      client['routingMap'].set('id', callback);

      manager.emit('disconnect', { err: new Error('broker shutdown') });

      expect(callback.called).to.be.false;
      expect(client['routingMap'].size).to.equal(1);
    });
  });
});
