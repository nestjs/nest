import { assert, expect } from 'chai';
import * as sinon from 'sinon';
import {
  NO_MESSAGE_HANDLER,
  RQM_DEFAULT_MAX_MESSAGE_SIZE,
  RQM_DEFAULT_QUEUE,
} from '../../constants';
import { RmqContext } from '../../ctx-host';
import { InvalidPacketIdException } from '../../errors/invalid-packet-id.exception';
import { MaxPacketLengthExceededException } from '../../errors/max-packet-length-exceeded.exception';
import { MessageHandler } from '../../interfaces/message-handler.interface';
import { ServerRMQ } from '../../server/server-rmq';
import { objectToMap } from './utils/object-to-map';

describe('ServerRMQ', () => {
  let server: ServerRMQ;
  let untypedServer: any;

  beforeEach(() => {
    server = new ServerRMQ({});
    untypedServer = server as any;
  });

  describe('listen', () => {
    let createClient: sinon.SinonStub;
    let onStub: sinon.SinonStub;
    let createChannelStub: sinon.SinonStub;
    let setupChannelStub: sinon.SinonStub;
    let client: any;
    let callbackSpy: sinon.SinonSpy;

    beforeEach(() => {
      onStub = sinon
        .stub()
        .callsFake((event, callback) => event === 'connect' && callback());
      createChannelStub = sinon.stub().callsFake(({ setup }) => setup());
      setupChannelStub = sinon
        .stub(server, 'setupChannel')
        .callsFake(() => ({}) as any);

      client = {
        on: onStub,
        once: onStub,
        createChannel: createChannelStub,
      };
      createClient = sinon.stub(server, 'createClient').callsFake(() => client);
      callbackSpy = sinon.spy();
    });
    afterEach(() => {
      setupChannelStub.restore();
    });
    it('should call "createClient"', async () => {
      await server.listen(callbackSpy);
      expect(createClient.called).to.be.true;
    });
    it('should bind "connect" event to handler', async () => {
      await server.listen(callbackSpy);
      expect(onStub.getCall(0).args[0]).to.be.equal('connect');
    });
    it('should bind "disconnected" event to handler', async () => {
      await server.listen(callbackSpy);
      expect(onStub.getCall(2).args[0]).to.be.equal('disconnect');
    });
    it('should bind "blocked" event to handler', async () => {
      await server.listen(callbackSpy);
      expect(onStub.getCall(3).args[0]).to.be.equal('blocked');
    });
    it('should bind "unblocked" event to handler', async () => {
      await server.listen(callbackSpy);
      expect(onStub.getCall(4).args[0]).to.be.equal('unblocked');
    });
    it('should bind "connectFailed" event to handler', async () => {
      await server.listen(callbackSpy);
      expect(onStub.getCall(5).args[0]).to.be.equal('connectFailed');
    });
    it('should push RmqStatus.BLOCKED when "blocked" fires', async () => {
      await server.listen(callbackSpy);
      const blockedCall = onStub
        .getCalls()
        .find(call => call.args[0] === 'blocked');
      expect(blockedCall).to.not.be.undefined;

      const statusValues: string[] = [];
      untypedServer._status$.subscribe((s: string) => statusValues.push(s));

      blockedCall!.args[1]({ reason: 'low memory' });
      expect(statusValues[statusValues.length - 1]).to.be.equal('blocked');
    });
    it('should push RmqStatus.UNBLOCKED when "unblocked" fires', async () => {
      await server.listen(callbackSpy);
      const unblockedCall = onStub
        .getCalls()
        .find(call => call.args[0] === 'unblocked');
      expect(unblockedCall).to.not.be.undefined;

      const statusValues: string[] = [];
      untypedServer._status$.subscribe((s: string) => statusValues.push(s));

      unblockedCall!.args[1]();
      expect(statusValues[statusValues.length - 1]).to.be.equal('unblocked');
    });
    describe('when "start" throws an exception', () => {
      it('should call callback with a thrown error as an argument', async () => {
        const error = new Error('random error');

        sinon.stub(server, 'start').callsFake(() => {
          throw error;
        });
        await server.listen(callbackSpy);
        expect(callbackSpy.calledWith(error)).to.be.true;
      });
    });
  });
  describe('close', () => {
    const rmqServer = { close: sinon.spy() };
    const rmqChannel = { close: sinon.spy() };

    beforeEach(() => {
      untypedServer.server = rmqServer;
      untypedServer.channel = rmqChannel;
    });
    it('should close server', async () => {
      await server.close();
      expect(rmqServer.close.called).to.be.true;
    });
    it('should close channel', async () => {
      await server.close();
      expect(rmqChannel.close.called).to.be.true;
    });
  });

  describe('handleMessage', () => {
    const createRawMessage = (content: string) => ({
      content: {
        toString: () => content,
      },
      properties: { correlationId: 1 },
    });
    const createMessage = payload => createRawMessage(JSON.stringify(payload));
    // "JSON.parse" copes with this depth but "JSON.stringify" throws a RangeError
    const createDeeplyNestedJson = (depth: number) =>
      '{"nested":'.repeat(depth) + '{}' + '}'.repeat(depth);
    const pattern = 'test';
    const msg = createMessage({
      pattern,
      data: 'tests',
      id: '3',
    });
    const channel = {
      nack: sinon.spy(),
    };

    let sendMessageStub: sinon.SinonStub;

    beforeEach(() => {
      sendMessageStub = sinon.stub(server, 'sendMessage').callsFake(() => ({}));
      untypedServer.channel = channel;
    });
    afterEach(() => {
      channel.nack.resetHistory();
    });
    it('should call "handleEvent" if identifier is not present', async () => {
      const handleEventSpy = sinon.spy(server, 'handleEvent');
      await server.handleMessage(createMessage({ pattern: '', data: '' }), '');
      expect(handleEventSpy.called).to.be.true;
    });
    it('should send NO_MESSAGE_HANDLER error if pattern is too deeply nested to be serialized', async () => {
      const deeplyNestedMsg = createRawMessage(
        `{"pattern":${createDeeplyNestedJson(100_000)},"data":"tests","id":"3"}`,
      );
      await server.handleMessage(deeplyNestedMsg, '');
      expect(
        sendMessageStub.calledWith({
          id: '3',
          status: 'error',
          err: NO_MESSAGE_HANDLER,
        }),
      ).to.be.true;
    });
    it('should send NO_MESSAGE_HANDLER error if key does not exists in handlers object', async () => {
      await server.handleMessage(msg, '');
      expect(
        sendMessageStub.calledWith({
          id: '3',
          status: 'error',
          err: NO_MESSAGE_HANDLER,
        }),
      ).to.be.true;
    });
    it('should call handler if exists in handlers object', async () => {
      const handler = sinon.spy();
      untypedServer.messageHandlers = objectToMap({
        [pattern]: handler as any,
      });
      await server.handleMessage(msg, '');
      expect(handler.calledOnce).to.be.true;
    });
    it('should not throw if the message is an invalid json', async () => {
      const invalidMsg = {
        content: {
          toString: () => 'd',
        },
        properties: { correlationId: 1 },
      };
      const handler = sinon.spy();
      untypedServer.messageHandlers = objectToMap({
        [pattern]: handler as any,
      });

      return server.handleMessage(invalidMsg, '').catch(() => {
        assert.fail('Was not supposed to throw an error');
      });
    });
    it('should negative acknowledge if message does not exists in handlers object and noAck option is false', async () => {
      untypedServer.noAck = false;
      await server.handleMessage(msg, '');
      expect(channel.nack.calledWith(msg, false, false)).to.be.true;
      expect(
        sendMessageStub.calledWith({
          id: '3',
          status: 'error',
          err: NO_MESSAGE_HANDLER,
        }),
      ).to.be.true;
    });
    it('should not negative acknowledge if key does not exists in handlers object and noAck option is true', async () => {
      await server.handleMessage(msg, '');
      expect(channel.nack.notCalled).to.be.true;
      expect(
        sendMessageStub.calledWith({
          id: '3',
          status: 'error',
          err: NO_MESSAGE_HANDLER,
        }),
      ).to.be.true;
    });

    describe('when the id of a request is neither a number nor a short string', () => {
      // The NO_MESSAGE_HANDLER reply carries a copy of the id
      const withId = (id: unknown) => createMessage({ pattern, data: '', id });

      (
        [
          ['a long string', 'a'.repeat(257)],
          ['an array', [[['3']]]],
          ['an object', { nested: {} }],
        ] as Array<[string, unknown]>
      ).forEach(([description, id]) => {
        it(`should not answer a request for an unknown pattern whose id is ${description}`, async () => {
          let error: unknown;
          await server
            .handleMessage(withId(id), '')
            .catch(err => (error = err));
          expect(error).to.be.instanceOf(InvalidPacketIdException);
          expect(sendMessageStub.called).to.be.false;
        });
      });

      it('should still negative acknowledge it when noAck option is false', async () => {
        untypedServer.noAck = false;
        const message = withId('a'.repeat(257));

        let error: unknown;
        await server.handleMessage(message, '').catch(err => (error = err));
        expect(error).to.be.instanceOf(InvalidPacketIdException);
        expect(channel.nack.calledWith(message, false, false)).to.be.true;
        expect(sendMessageStub.called).to.be.false;
      });

      it('should answer a request for an unknown pattern whose id is at the limit', async () => {
        await server.handleMessage(withId('a'.repeat(256)), '');

        expect(
          sendMessageStub.calledWith(
            { id: 'a'.repeat(256), status: 'error', err: NO_MESSAGE_HANDLER },
            undefined,
            1,
            sinon.match.instanceOf(RmqContext),
          ),
        ).to.be.true;
      });

      it('should still run the handler of a known pattern, whose replies do not carry the id', async () => {
        const handler = sinon.stub().resolves('result');
        untypedServer.messageHandlers = objectToMap({ [pattern]: handler });

        await server.handleMessage(withId('a'.repeat(257)), '');

        expect(handler.calledOnce).to.be.true;
      });
    });

    describe('when the body exceeds "maxMessageSize"', () => {
      // The size of '{"pattern":"test","data":"123","id":"3"}'
      const maxMessageSize = 40;
      const oversizedContent = () =>
        Buffer.from(JSON.stringify({ pattern, data: '123', id: '3' }) + ' ');
      const errorMessage = new MaxPacketLengthExceededException(
        maxMessageSize + 1,
      ).message;

      let handler: sinon.SinonStub;
      let loggerErrorStub: sinon.SinonStub;

      beforeEach(() => {
        server = new ServerRMQ({ maxMessageSize });
        untypedServer = server as any;
        untypedServer.channel = channel;
        sendMessageStub = sinon.stub(server, 'sendMessage');
        loggerErrorStub = sinon.stub(untypedServer.logger, 'error');
        handler = sinon.stub().resolves(undefined);
        untypedServer.messageHandlers = objectToMap({ [pattern]: handler });
      });

      it('should log and skip the message without decoding it', async () => {
        const content = oversizedContent();
        expect(content.length).to.equal(maxMessageSize + 1);
        const toStringSpy = sinon.spy(content, 'toString');

        await server.handleMessage({ content, properties: {} }, channel);

        expect(toStringSpy.called).to.be.false;
        expect(handler.called).to.be.false;
        expect(loggerErrorStub.calledOnce).to.be.true;
        expect(loggerErrorStub.firstCall.args[0]).to.include(errorMessage);
        expect(channel.nack.called).to.be.false;
        expect(sendMessageStub.called).to.be.false;
      });

      it('should negative acknowledge it without requeue when noAck option is false', async () => {
        untypedServer.noAck = false;
        const message = { content: oversizedContent(), properties: {} };

        await server.handleMessage(message, channel);

        expect(channel.nack.calledWith(message, false, false)).to.be.true;
        expect(handler.called).to.be.false;
      });

      it('should answer a request that names a reply queue with an error', async () => {
        await server.handleMessage(
          {
            content: oversizedContent(),
            properties: { replyTo: 'reply-queue', correlationId: 'abc' },
          },
          channel,
        );

        expect(handler.called).to.be.false;
        expect(sendMessageStub.calledOnce).to.be.true;
        const [packet, replyTo, correlationId, context] =
          sendMessageStub.firstCall.args;
        expect(packet).to.deep.equal({
          id: 'abc',
          err: errorMessage,
          status: 'error',
        });
        expect(replyTo).to.equal('reply-queue');
        expect(correlationId).to.equal('abc');
        expect(context).to.be.instanceOf(RmqContext);
      });

      it('should handle a message of exactly "maxMessageSize" bytes', async () => {
        const content = Buffer.from(
          JSON.stringify({ pattern, data: '123', id: '3' }),
        );
        expect(content.length).to.equal(maxMessageSize);

        await server.handleMessage({ content, properties: {} }, channel);

        expect(handler.calledOnce).to.be.true;
        expect(handler.firstCall.args[0]).to.equal('123');
        expect(handler.firstCall.args[1]).to.be.instanceOf(RmqContext);
        expect(loggerErrorStub.called).to.be.false;
      });

      it('should default to 16 MiB', () => {
        expect(RQM_DEFAULT_MAX_MESSAGE_SIZE).to.equal(16 * 1024 * 1024);
        expect(new ServerRMQ({})['maxMessageSize']).to.equal(
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
            new ServerRMQ({ maxMessageSize: value as number })[
              'maxMessageSize'
            ],
          ).to.equal(RQM_DEFAULT_MAX_MESSAGE_SIZE);
        });
      });

      it('should keep Infinity', () => {
        expect(
          new ServerRMQ({ maxMessageSize: Infinity })['maxMessageSize'],
        ).to.equal(Infinity);
      });
    });
  });
  describe('setupChannel', () => {
    const queue = 'test';
    const exchange = 'test.exchange';
    const queueOptions = {};
    const isGlobalPrefetchCount = true;
    const prefetchCount = 10;

    let channel: any = {};

    beforeEach(() => {
      untypedServer['queue'] = queue;
      untypedServer['queueOptions'] = queueOptions;
      untypedServer['options'] = {
        isGlobalPrefetchCount,
        prefetchCount,
      };

      channel = {
        assertQueue: sinon.spy(() => ({ queue })),
        prefetch: sinon.spy(),
        consume: sinon.spy(),
        assertExchange: sinon.spy(() => ({})),
        bindQueue: sinon.spy(),
      };
    });
    it('should call "assertQueue" with queue and queue options when noAssert is false', async () => {
      server['noAssert' as any] = false;

      await server.setupChannel(channel, () => null);
      expect(channel.assertQueue.calledWith(queue, queueOptions)).to.be.true;
    });
    it('should call "assertQueue" with queue and queue options when queue is default queue', async () => {
      server['queue' as any] = RQM_DEFAULT_QUEUE;

      await server.setupChannel(channel, () => null);
      expect(channel.assertQueue.calledWith(RQM_DEFAULT_QUEUE, queueOptions)).to
        .be.true;
    });
    it('should not call "assertQueue" when noAssert is true', async () => {
      server['options' as any] = {
        ...(server as any)['options'],
        noAssert: true,
      };

      await server.setupChannel(channel, () => null);
      expect(channel.assertQueue.called).not.to.be.true;
    });
    it('should call "bindQueue" with exchangeType is fanout', async () => {
      const namedQueue = 'exclusive-queue-name';
      channel.assertQueue = sinon.spy(() => ({ queue: namedQueue }));
      server['queue' as any] = RQM_DEFAULT_QUEUE;
      server['options' as any] = {
        ...(server as any)['options'],
        exchangeType: 'fanout',
        exchange: exchange,
      };
      await server.setupChannel(channel, () => null);
      expect(channel.bindQueue.calledWith(namedQueue, exchange, '')).to.be.true;
    });
    it('should call "prefetch" with prefetchCount and "isGlobalPrefetchCount"', async () => {
      await server.setupChannel(channel, () => null);
      expect(channel.prefetch.calledWith(prefetchCount, isGlobalPrefetchCount))
        .to.be.true;
    });
    it('should call "consumeChannel" method', async () => {
      await server.setupChannel(channel, () => null);
      expect(channel.consume.called).to.be.true;
    });
    it('should route "handleMessage" rejections to "handleError" instead of leaving them unhandled', async () => {
      const error = new Error('unexpected');
      sinon.stub(server, 'handleMessage').rejects(error);
      const handleErrorStub = sinon.stub(untypedServer, 'handleError');

      await server.setupChannel(channel, () => null);
      const onMessage = channel.consume.firstCall.args[1];
      await onMessage({});

      expect(handleErrorStub.calledWith(error)).to.be.true;
    });
    it('should call "resolve" function', async () => {
      const resolve = sinon.spy();
      await server.setupChannel(channel, resolve);
      expect(resolve.called).to.be.true;
    });
  });

  describe('sendMessage', () => {
    const context = new RmqContext([] as any);

    let channel: any;

    beforeEach(() => {
      channel = {
        sendToQueue: sinon.spy(),
      };
      server['channel'] = channel;
    });

    it('should publish message to indicated queue', () => {
      const message = { test: true };
      const replyTo = 'test';
      const correlationId = '0';

      server.sendMessage(message, replyTo, correlationId, context);
      expect(
        channel.sendToQueue.calledWith(
          replyTo,
          Buffer.from(JSON.stringify(message)),
          { correlationId },
        ),
      ).to.be.true;
    });
    describe('when "replyTo" or "correlationId" is too long for AMQP', () => {
      // amqplib decodes 86 bytes of invalid UTF-8 as 86 replacement
      // characters, which take 258 bytes to encode again
      const tooLong = '\ufffd'.repeat(86);
      let loggerErrorStub: sinon.SinonStub;

      beforeEach(() => {
        loggerErrorStub = sinon.stub(untypedServer.logger, 'error');
      });

      it('should drop the reply and log an error', () => {
        server.sendMessage({ test: true }, tooLong, '0', context);
        server.sendMessage({ test: true }, 'test', tooLong, context);

        expect(channel.sendToQueue.called).to.be.false;
        expect(loggerErrorStub.calledTwice).to.be.true;
      });
      it('should publish values of up to 255 bytes', () => {
        const longest = 'a'.repeat(255);

        server.sendMessage({ test: true }, longest, longest, context);

        expect(
          channel.sendToQueue.calledWith(
            longest,
            sinon.match.instanceOf(Buffer),
            {
              correlationId: longest,
            },
          ),
        ).to.be.true;
      });
      it('should publish a reply without "replyTo" as before', () => {
        server.sendMessage({ test: true }, undefined, '0', context);

        expect(
          channel.sendToQueue.calledWith(
            undefined,
            sinon.match.instanceOf(Buffer),
            { correlationId: '0' },
          ),
        ).to.be.true;
      });
    });
  });

  describe('handleEvent', () => {
    const channel = 'test';
    const data = 'test';

    it('should call handler with expected arguments', async () => {
      const handler = sinon.spy();
      untypedServer.messageHandlers = objectToMap({
        [channel]: handler,
      });

      await server.handleEvent(
        channel,
        { pattern: '', data },
        new RmqContext([{}, {}, '']),
      );
      expect(handler.calledWith(data)).to.be.true;
    });

    it('should negative acknowledge without retrying if key does not exists in handlers object and noAck option is false', async () => {
      const nack = sinon.spy();
      const message = { pattern: 'no-exists', data };
      untypedServer.channel = {
        nack,
      };
      untypedServer.noAck = false;
      await server.handleEvent(
        channel,
        message,
        new RmqContext([message, '', '']),
      );

      expect(nack.calledWith(message, false, false)).to.be.true;
    });

    it('should not negative acknowledge if key does not exists in handlers object but noAck option is true', async () => {
      const nack = sinon.spy();
      const message = { pattern: 'no-exists', data };
      untypedServer.channel = {
        nack,
      };
      untypedServer.noAck = true;
      await server.handleEvent(
        channel,
        message,
        new RmqContext([message, '', '']),
      );

      expect(nack.calledWith(message, false, false)).not.to.be.true;
    });
  });

  describe('matchRmqPattern', () => {
    let matchRmqPattern: (pattern: string, routingKey: string) => boolean;

    beforeEach(() => {
      matchRmqPattern = untypedServer.matchRmqPattern.bind(untypedServer);
    });

    describe('exact matches', () => {
      it('should match identical patterns', () => {
        expect(matchRmqPattern('user.created', 'user.created')).to.be.true;
        expect(matchRmqPattern('order.updated', 'order.updated')).to.be.true;
      });

      it('should not match different patterns', () => {
        expect(matchRmqPattern('user.created', 'user.updated')).to.be.false;
        expect(matchRmqPattern('order.created', 'user.created')).to.be.false;
      });

      it('should handle patterns with $ character (original issue)', () => {
        expect(
          matchRmqPattern('$internal.plugin.status', '$internal.plugin.status'),
        ).to.be.true;
        expect(
          matchRmqPattern(
            '$internal.plugin.0.status',
            '$internal.plugin.0.status',
          ),
        ).to.be.true;
        expect(matchRmqPattern('user.$special.event', 'user.$special.event')).to
          .be.true;
      });
    });

    describe('single wildcard (*)', () => {
      it('should match single segments', () => {
        expect(matchRmqPattern('user.*', 'user.created')).to.be.true;
        expect(matchRmqPattern('user.*', 'user.updated')).to.be.true;
        expect(matchRmqPattern('*.created', 'user.created')).to.be.true;
        expect(matchRmqPattern('*.created', 'order.created')).to.be.true;
      });

      it('should not match when segment counts differ', () => {
        expect(matchRmqPattern('user.*', 'user.profile.created')).to.be.false;
        expect(matchRmqPattern('*.created', 'user.profile.created')).to.be
          .false;
      });

      it('should handle patterns with $ and *', () => {
        expect(
          matchRmqPattern(
            '$internal.plugin.*.status',
            '$internal.plugin.0.status',
          ),
        ).to.be.true;
        expect(
          matchRmqPattern(
            '$internal.plugin.*.status',
            '$internal.plugin.1.status',
          ),
        ).to.be.true;
        expect(matchRmqPattern('$internal.*.status', '$internal.plugin.status'))
          .to.be.true;
      });

      it('should handle multiple * wildcards', () => {
        expect(matchRmqPattern('*.*.created', 'user.profile.created')).to.be
          .true;
        expect(matchRmqPattern('*.*.created', 'order.item.created')).to.be.true;
        expect(matchRmqPattern('*.*.created', 'user.created')).to.be.false;
      });
    });

    describe('catch all wildcard (#)', () => {
      it('should match when # is at the end', () => {
        expect(matchRmqPattern('user.#', 'user.created')).to.be.true;
        expect(matchRmqPattern('user.#', 'user.profile.created')).to.be.true;
        expect(matchRmqPattern('user.#', 'user.profile.details.updated')).to.be
          .true;
      });

      it('should handle patterns with $ and #', () => {
        expect(matchRmqPattern('$internal.#', '$internal.plugin.status')).to.be
          .true;
        expect(matchRmqPattern('$internal.#', '$internal.plugin.0.status')).to
          .be.true;
        expect(
          matchRmqPattern('$internal.plugin.#', '$internal.plugin.0.status'),
        ).to.be.true;
      });

      it('should handle # at the beginning', () => {
        expect(matchRmqPattern('#', 'user.created')).to.be.true;
        expect(matchRmqPattern('#', 'user.profile.created')).to.be.true;
        expect(matchRmqPattern('#', 'created')).to.be.true;
      });
    });

    describe('edge cases', () => {
      it('should handle empty routing key', () => {
        expect(matchRmqPattern('user.created', '')).to.be.false;
        expect(matchRmqPattern('*', '')).to.be.false;
        expect(matchRmqPattern('#', '')).to.be.true;
      });

      it('should not match a key longer than a routing key may be', () => {
        // A routing key has at most 255 bytes, so the broker routes none longer
        expect(matchRmqPattern('#', 'a'.repeat(255))).to.be.true;
        expect(matchRmqPattern('#', 'a'.repeat(256))).to.be.false;
        expect(matchRmqPattern('#', '.'.repeat(255))).to.be.true;
        expect(matchRmqPattern('#', '.'.repeat(256))).to.be.false;
        expect(matchRmqPattern('users.#', `users.${'a'.repeat(250)}`)).to.be
          .false;
        expect(matchRmqPattern('users.#', `users.${'a'.repeat(249)}`)).to.be
          .true;
      });

      it('should handle single segments', () => {
        expect(matchRmqPattern('user', 'user')).to.be.true;
        expect(matchRmqPattern('*', 'user')).to.be.true;
        expect(matchRmqPattern('#', 'user')).to.be.true;
      });

      it('should handle complex $ patterns that previously failed', () => {
        expect(
          matchRmqPattern(
            '$exchange.*.routing.#',
            '$exchange.topic.routing.key.test',
          ),
        ).to.be.true;
        expect(matchRmqPattern('$sys.#', '$sys.broker.clients')).to.be.true;
        expect(matchRmqPattern('$SYS.#', '$SYS.broker.load.messages.received'))
          .to.be.true;
      });
    });
  });

  describe('initializeWildcardHandlersIfExist', () => {
    it('skips non-string handler keys without throwing', () => {
      const handlers = new Map<unknown, MessageHandler>();
      handlers.set(undefined, () => Promise.resolve());
      handlers.set(0, () => Promise.resolve());
      handlers.set('orders.*', () => Promise.resolve());
      handlers.set('orders.created', () => Promise.resolve());
      sinon
        .stub(server, 'getHandlers')
        .returns(handlers as Map<string, MessageHandler>);

      expect(() =>
        untypedServer.initializeWildcardHandlersIfExist(),
      ).to.not.throw();
      expect(untypedServer.wildcardHandlers.size).to.equal(1);
      expect(untypedServer.wildcardHandlers.has('orders.*')).to.be.true;
    });

    it('should match a pattern longer than a routing key against exact handlers only', () => {
      server = new ServerRMQ({ wildcards: true });
      const longPattern = `users.${'a'.repeat(250)}`;
      const wildcardHandler = sinon.spy();
      const exactHandler = sinon.spy();
      server.addHandler('users.#', wildcardHandler as any);
      (server as any).initializeWildcardHandlersIfExist();

      expect(server.getHandlerByPattern(longPattern)).to.be.null;

      server.addHandler(longPattern, exactHandler as any);
      expect(server.getHandlerByPattern(longPattern)).to.equal(exactHandler);
    });
  });
});
