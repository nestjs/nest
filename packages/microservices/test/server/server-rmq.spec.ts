import { NO_MESSAGE_HANDLER, RQM_DEFAULT_QUEUE } from '../../constants.js';
import { RmqContext } from '../../ctx-host/index.js';
import { ServerRMQ } from '../../server/server-rmq.js';
import { objectToMap } from './utils/object-to-map.js';

describe('ServerRMQ', () => {
  let server: ServerRMQ;
  let untypedServer: any;

  beforeEach(() => {
    server = new ServerRMQ({});
    untypedServer = server as any;
  });

  describe('listen', () => {
    let createClient: ReturnType<typeof vi.fn>;
    let onStub: ReturnType<typeof vi.fn>;
    let createChannelStub: ReturnType<typeof vi.fn>;
    let setupChannelStub: ReturnType<typeof vi.fn>;
    let client: any;
    let callbackSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      onStub = vi
        .fn()
        .mockImplementation(
          (event, callback) => event === 'connect' && callback(),
        );
      createChannelStub = vi.fn().mockImplementation(({ setup }) => setup());
      setupChannelStub = vi
        .spyOn(server, 'setupChannel')
        .mockImplementation(() => ({}) as any);

      client = {
        on: onStub,
        once: onStub,
        createChannel: createChannelStub,
      };
      createClient = vi
        .spyOn(server, 'createClient')
        .mockImplementation(() => client);
      callbackSpy = vi.fn();
    });
    afterEach(() => {
      setupChannelStub.mockRestore();
    });
    it('should call "createClient"', async () => {
      await server.listen(callbackSpy);
      expect(createClient).toHaveBeenCalled();
    });
    it('should bind "connect" event to handler', async () => {
      await server.listen(callbackSpy);
      expect(onStub.mock.calls[0][0]).toBe('connect');
    });
    it('should bind "disconnected" event to handler', async () => {
      await server.listen(callbackSpy);
      expect(onStub.mock.calls[2][0]).toBe('disconnect');
    });
    it('should bind "connectFailed" event to handler', async () => {
      await server.listen(callbackSpy);
      expect(onStub.mock.calls[3][0]).toBe('connectFailed');
    });
    describe('when "start" throws an exception', () => {
      it('should call callback with a thrown error as an argument', async () => {
        const error = new Error('random error');

        vi.spyOn(server, 'start').mockImplementation(() => {
          throw error;
        });
        await server.listen(callbackSpy);
        expect(callbackSpy).toHaveBeenCalledWith(error);
      });
    });
  });
  describe('close', () => {
    const rmqServer = { close: vi.fn() };
    const rmqChannel = { close: vi.fn() };

    beforeEach(() => {
      untypedServer.server = rmqServer;
      untypedServer.channel = rmqChannel;
    });
    it('should close server', async () => {
      await server.close();
      expect(rmqServer.close).toHaveBeenCalled();
    });
    it('should close channel', async () => {
      await server.close();
      expect(rmqChannel.close).toHaveBeenCalled();
    });
  });

  describe('handleMessage', () => {
    const createMessage = payload => ({
      content: {
        toString: () => JSON.stringify(payload),
      },
      properties: { correlationId: 1 },
    });
    const pattern = 'test';
    const msg = createMessage({
      pattern,
      data: 'tests',
      id: '3',
    });
    const channel = {
      nack: vi.fn(),
    };

    let sendMessageStub: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      sendMessageStub = vi
        .spyOn(server, 'sendMessage')
        .mockImplementation(() => ({}));
      untypedServer.channel = channel;
    });
    afterEach(() => {
      channel.nack.mockReset();
    });
    it('should call "handleEvent" if identifier is not present', async () => {
      const handleEventSpy = vi.spyOn(server, 'handleEvent');
      await server.handleMessage(createMessage({ pattern: '', data: '' }), '');
      expect(handleEventSpy).toHaveBeenCalled();
    });
    it('should send NO_MESSAGE_HANDLER error if key does not exists in handlers object', async () => {
      await server.handleMessage(msg, '');
      expect(sendMessageStub).toHaveBeenCalledWith(
        {
          id: '3',
          status: 'error',
          err: NO_MESSAGE_HANDLER,
        },
        undefined,
        1,
        expect.any(RmqContext),
      );
    });
    it('should call handler if exists in handlers object', async () => {
      const handler = vi.fn();
      untypedServer.messageHandlers = objectToMap({
        [pattern]: handler as any,
      });
      await server.handleMessage(msg, '');
      expect(handler).toHaveBeenCalledOnce();
    });
    it('should not throw if the message is an invalid json', async () => {
      const invalidMsg = {
        content: {
          toString: () => 'd',
        },
        properties: { correlationId: 1 },
      };
      const handler = vi.fn();
      untypedServer.messageHandlers = objectToMap({
        [pattern]: handler as any,
      });

      return server.handleMessage(invalidMsg, '').catch(() => {
        throw new Error('Was not supposed to throw an error');
      });
    });
    it('should negative acknowledge if message does not exists in handlers object and noAck option is false', async () => {
      untypedServer.noAck = false;
      await server.handleMessage(msg, '');
      expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
      expect(sendMessageStub).toHaveBeenCalledWith(
        {
          id: '3',
          status: 'error',
          err: NO_MESSAGE_HANDLER,
        },
        undefined,
        1,
        expect.any(RmqContext),
      );
    });
    it('should not negative acknowledge if key does not exists in handlers object and noAck option is true', async () => {
      await server.handleMessage(msg, '');
      expect(channel.nack).not.toHaveBeenCalled();
      expect(sendMessageStub).toHaveBeenCalledWith(
        {
          id: '3',
          status: 'error',
          err: NO_MESSAGE_HANDLER,
        },
        undefined,
        1,
        expect.any(RmqContext),
      );
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
        assertQueue: vi.fn(() => ({ queue })),
        prefetch: vi.fn(),
        consume: vi.fn(),
        assertExchange: vi.fn(() => ({})),
        bindQueue: vi.fn(),
      };
    });
    it('should call "assertQueue" with queue and queue options when noAssert is false', async () => {
      server['noAssert' as any] = false;

      await server.setupChannel(channel, () => null);
      expect(channel.assertQueue).toHaveBeenCalledWith(queue, queueOptions);
    });
    it('should call "assertQueue" with queue and queue options when queue is default queue', async () => {
      server['queue' as any] = RQM_DEFAULT_QUEUE;

      await server.setupChannel(channel, () => null);
      expect(channel.assertQueue).toHaveBeenCalledWith(
        RQM_DEFAULT_QUEUE,
        queueOptions,
      );
    });
    it('should not call "assertQueue" when noAssert is true', async () => {
      server['options' as any] = {
        ...(server as any)['options'],
        noAssert: true,
      };

      await server.setupChannel(channel, () => null);
      expect(channel.assertQueue).not.toHaveBeenCalled();
    });
    it('should call "bindQueue" with exchangeType is fanout', async () => {
      const namedQueue = 'exclusive-queue-name';
      channel.assertQueue = vi.fn(() => ({ queue: namedQueue }));
      server['queue' as any] = RQM_DEFAULT_QUEUE;
      server['options' as any] = {
        ...(server as any)['options'],
        exchangeType: 'fanout',
        exchange: exchange,
      };
      await server.setupChannel(channel, () => null);
      expect(channel.bindQueue).toHaveBeenCalledWith(namedQueue, exchange, '');
    });
    it('should call "prefetch" with prefetchCount and "isGlobalPrefetchCount"', async () => {
      await server.setupChannel(channel, () => null);
      expect(channel.prefetch).toHaveBeenCalledWith(
        prefetchCount,
        isGlobalPrefetchCount,
      );
    });
    it('should call "consumeChannel" method', async () => {
      await server.setupChannel(channel, () => null);
      expect(channel.consume).toHaveBeenCalled();
    });
    it('should call "resolve" function', async () => {
      const resolve = vi.fn();
      await server.setupChannel(channel, resolve);
      expect(resolve).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    const context = new RmqContext([] as any);

    let channel: any;

    beforeEach(() => {
      channel = {
        sendToQueue: vi.fn(),
      };
      server['channel'] = channel;
    });

    it('should publish message to indicated queue', () => {
      const message = { test: true };
      const replyTo = 'test';
      const correlationId = '0';

      server.sendMessage(message, replyTo, correlationId, context);
      expect(channel.sendToQueue).toHaveBeenCalledWith(
        replyTo,
        Buffer.from(JSON.stringify(message)),
        { correlationId },
      );
    });
  });

  describe('handleEvent', () => {
    const channel = 'test';
    const data = 'test';

    it('should call handler with expected arguments', async () => {
      const handler = vi.fn();
      untypedServer.messageHandlers = objectToMap({
        [channel]: handler,
      });

      await server.handleEvent(
        channel,
        { pattern: '', data },
        new RmqContext([{}, {}, '']),
      );
      expect(handler).toHaveBeenCalledWith(data, expect.any(RmqContext));
    });

    it('should negative acknowledge without retrying if key does not exists in handlers object and noAck option is false', async () => {
      const nack = vi.fn();
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

      expect(nack).toHaveBeenCalledWith(message, false, false);
    });

    it('should not negative acknowledge if key does not exists in handlers object but noAck option is true', async () => {
      const nack = vi.fn();
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

      expect(nack).not.toHaveBeenCalledWith(message, false, false);
    });
  });

  describe('matchRmqPattern', () => {
    let matchRmqPattern: (pattern: string, routingKey: string) => boolean;

    beforeEach(() => {
      matchRmqPattern = untypedServer.matchRmqPattern.bind(untypedServer);
    });

    describe('exact matches', () => {
      it('should match identical patterns', () => {
        expect(matchRmqPattern('user.created', 'user.created')).toBe(true);
        expect(matchRmqPattern('order.updated', 'order.updated')).toBe(true);
      });

      it('should not match different patterns', () => {
        expect(matchRmqPattern('user.created', 'user.updated')).toBe(false);
        expect(matchRmqPattern('order.created', 'user.created')).toBe(false);
      });

      it('should handle patterns with $ character (original issue)', () => {
        expect(
          matchRmqPattern('$internal.plugin.status', '$internal.plugin.status'),
        ).toBe(true);
        expect(
          matchRmqPattern(
            '$internal.plugin.0.status',
            '$internal.plugin.0.status',
          ),
        ).toBe(true);
        expect(
          matchRmqPattern('user.$special.event', 'user.$special.event'),
        ).toBe(true);
      });
    });

    describe('single wildcard (*)', () => {
      it('should match single segments', () => {
        expect(matchRmqPattern('user.*', 'user.created')).toBe(true);
        expect(matchRmqPattern('user.*', 'user.updated')).toBe(true);
        expect(matchRmqPattern('*.created', 'user.created')).toBe(true);
        expect(matchRmqPattern('*.created', 'order.created')).toBe(true);
      });

      it('should not match when segment counts differ', () => {
        expect(matchRmqPattern('user.*', 'user.profile.created')).toBe(false);
        expect(matchRmqPattern('*.created', 'user.profile.created')).toBe(
          false,
        );
      });

      it('should handle patterns with $ and *', () => {
        expect(
          matchRmqPattern(
            '$internal.plugin.*.status',
            '$internal.plugin.0.status',
          ),
        ).toBe(true);
        expect(
          matchRmqPattern(
            '$internal.plugin.*.status',
            '$internal.plugin.1.status',
          ),
        ).toBe(true);
        expect(
          matchRmqPattern('$internal.*.status', '$internal.plugin.status'),
        ).toBe(true);
      });

      it('should handle multiple * wildcards', () => {
        expect(matchRmqPattern('*.*.created', 'user.profile.created')).toBe(
          true,
        );
        expect(matchRmqPattern('*.*.created', 'order.item.created')).toBe(true);
        expect(matchRmqPattern('*.*.created', 'user.created')).toBe(false);
      });
    });

    describe('catch all wildcard (#)', () => {
      it('should match when # is at the end', () => {
        expect(matchRmqPattern('user.#', 'user.created')).toBe(true);
        expect(matchRmqPattern('user.#', 'user.profile.created')).toBe(true);
        expect(matchRmqPattern('user.#', 'user.profile.details.updated')).toBe(
          true,
        );
      });

      it('should handle patterns with $ and #', () => {
        expect(matchRmqPattern('$internal.#', '$internal.plugin.status')).toBe(
          true,
        );
        expect(
          matchRmqPattern('$internal.#', '$internal.plugin.0.status'),
        ).toBe(true);
        expect(
          matchRmqPattern('$internal.plugin.#', '$internal.plugin.0.status'),
        ).toBe(true);
      });

      it('should handle # at the beginning', () => {
        expect(matchRmqPattern('#', 'user.created')).toBe(true);
        expect(matchRmqPattern('#', 'user.profile.created')).toBe(true);
        expect(matchRmqPattern('#', 'created')).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle empty routing key', () => {
        expect(matchRmqPattern('user.created', '')).toBe(false);
        expect(matchRmqPattern('*', '')).toBe(false);
        expect(matchRmqPattern('#', '')).toBe(true);
      });

      it('should handle single segments', () => {
        expect(matchRmqPattern('user', 'user')).toBe(true);
        expect(matchRmqPattern('*', 'user')).toBe(true);
        expect(matchRmqPattern('#', 'user')).toBe(true);
      });

      it('should handle complex $ patterns that previously failed', () => {
        expect(
          matchRmqPattern(
            '$exchange.*.routing.#',
            '$exchange.topic.routing.key.test',
          ),
        ).toBe(true);
        expect(matchRmqPattern('$sys.#', '$sys.broker.clients')).toBe(true);
        expect(
          matchRmqPattern('$SYS.#', '$SYS.broker.load.messages.received'),
        ).toBe(true);
      });
    });
  });
});
