import { Logger } from '@nestjs/common';
import { concat, EMPTY, of, Subject, throwError } from 'rxjs';
import { NO_MESSAGE_HANDLER } from '../../constants.js';
import { KafkaContext } from '../../ctx-host/index.js';
import { KafkaHeaders } from '../../enums/index.js';
import { MaxPacketLengthExceededException } from '../../errors/max-packet-length-exceeded.exception.js';
import { KafkaRetriableException } from '../../exceptions/index.js';
import { RpcExceptionsHandler } from '../../exceptions/rpc-exceptions-handler.js';
import {
  EachMessagePayload,
  KafkaMessage,
} from '../../external/kafka.interface.js';
import { ServerKafka } from '../../server/index.js';
import { objectToMap } from './utils/object-to-map.js';

class NoopLogger extends Logger {
  log(message: any, context?: string): void {}
  error(message: any, trace?: string, context?: string): void {}
  warn(message: any, context?: string): void {}
}

describe('ServerKafka', () => {
  const topic = 'test.topic';
  const replyTopic = 'test.topic.reply';
  const replyPartition = '0';
  const correlationId = '696fa0a9-1827-4e59-baef-f3628173fe4f';
  const key = '1';
  const timestamp = new Date().toISOString();
  const messageValue = 'test-message';
  const heartbeat = async () => {};
  const pause = () => () => {};

  const eventMessage: KafkaMessage = {
    key: Buffer.from(key),
    offset: '0',
    size: messageValue.length,
    value: Buffer.from(messageValue),
    timestamp,
    attributes: 1,
  };
  const eventPayload: EachMessagePayload = {
    topic,
    partition: 0,
    message: Object.assign(
      {
        headers: {},
      },
      eventMessage,
    ),
    heartbeat,
    pause,
  };

  const eventWithCorrelationIdPayload: EachMessagePayload = {
    topic,
    partition: 0,
    message: Object.assign(
      {
        headers: {
          [KafkaHeaders.CORRELATION_ID]: Buffer.from(correlationId),
        },
      },
      eventMessage,
    ),
    heartbeat,
    pause,
  };

  const message: KafkaMessage = Object.assign(
    {
      headers: {
        [KafkaHeaders.CORRELATION_ID]: Buffer.from(correlationId),
        [KafkaHeaders.REPLY_TOPIC]: Buffer.from(replyTopic),
        [KafkaHeaders.REPLY_PARTITION]: Buffer.from(replyPartition),
      },
    },
    eventMessage,
  );
  const payload: EachMessagePayload = {
    topic,
    partition: 0,
    message,
    heartbeat,
    pause,
  };

  let server: ServerKafka;
  let untypedServer: any;
  let callback: ReturnType<typeof vi.fn>;
  let bindEventsStub: ReturnType<typeof vi.fn>;
  let connect: ReturnType<typeof vi.fn>;
  let subscribe: ReturnType<typeof vi.fn>;
  let run: ReturnType<typeof vi.fn>;
  let send: ReturnType<typeof vi.fn>;
  let on: ReturnType<typeof vi.fn>;
  let consumerStub: ReturnType<typeof vi.fn>;
  let producerStub: ReturnType<typeof vi.fn>;
  let client: any;

  beforeEach(() => {
    server = new ServerKafka({});
    untypedServer = server as any;

    callback = vi.fn();
    connect = vi.fn();
    subscribe = vi.fn();
    run = vi.fn();
    send = vi.fn();
    on = vi.fn();

    consumerStub = vi.fn(() => {
      return {
        connect,
        subscribe,
        run,
        on,
        events: {
          GROUP_JOIN: 'consumer.group_join',
          HEARTBEAT: 'consumer.heartbeat',
          COMMIT_OFFSETS: 'consumer.commit_offsets',
          FETCH_START: 'consumer.fetch_start',
          FETCH: 'consumer.fetch',
          START_BATCH_PROCESS: 'consumer.start_batch_process',
          END_BATCH_PROCESS: 'consumer.end_batch_process',
          CONNECT: 'consumer.connect',
          DISCONNECT: 'consumer.disconnect',
          STOP: 'consumer.stop',
          CRASH: 'consumer.crash',
          REBALANCING: 'consumer.rebalancing',
          RECEIVED_UNSUBSCRIBED_TOPICS: 'consumer.received_unsubscribed_topics',
          REQUEST: 'consumer.network.request',
          REQUEST_TIMEOUT: 'consumer.network.request_timeout',
          REQUEST_QUEUE_SIZE: 'consumer.network.request_queue_size',
        },
      };
    });
    producerStub = vi.fn(() => {
      return {
        connect,
        send,
        on,
        events: {
          CONNECT: 'producer.connect',
          DISCONNECT: 'producer.disconnect',
          REQUEST: 'producer.network.request',
          REQUEST_TIMEOUT: 'producer.network.request_timeout',
          REQUEST_QUEUE_SIZE: 'producer.network.request_queue_size',
        },
      };
    });
    client = {
      consumer: consumerStub,
      producer: producerStub,
    };
    vi.spyOn(server, 'createClient').mockImplementation(async () => client);

    untypedServer = server as any;
  });

  describe('listen', () => {
    it('should call "bindEvents"', async () => {
      bindEventsStub = vi
        .spyOn(server, 'bindEvents')
        .mockImplementation(() => ({}) as any);

      await server.listen(() => {});
      expect(bindEventsStub).toHaveBeenCalled();
    });
    it('should call callback', async () => {
      await server.listen(callback);
      expect(callback).toHaveBeenCalled();
    });
    describe('when "start" throws an exception', () => {
      it('should call callback with a thrown error as an argument', async () => {
        const error = new Error('random error');

        const callbackSpy = vi.fn();
        vi.spyOn(server, 'start').mockImplementation(() => {
          throw error;
        });
        await server.listen(callbackSpy);
        expect(callbackSpy).toHaveBeenCalledWith(error);
      });
    });
  });

  describe('close', () => {
    let consumer: { disconnect: ReturnType<typeof vi.fn> };
    let producer: { disconnect: ReturnType<typeof vi.fn> };
    beforeEach(() => {
      consumer = { disconnect: vi.fn() };
      producer = { disconnect: vi.fn() };
      untypedServer.consumer = consumer;
      untypedServer.producer = producer;
      untypedServer.client = client;
    });
    it('should close server', async () => {
      await server.close();

      expect(consumer.disconnect).toHaveBeenCalledOnce();
      expect(producer.disconnect).toHaveBeenCalledOnce();
      expect(untypedServer.consumer).toBeNull();
      expect(untypedServer.producer).toBeNull();
      expect(untypedServer.client).toBeNull();
    });
    // Replies of the handlers the consumer waits for go through the producer
    it('should disconnect the producer only once the consumer has disconnected', async () => {
      let resolveConsumer!: () => void;
      consumer.disconnect.mockReturnValue(
        new Promise<void>(resolve => (resolveConsumer = resolve)),
      );

      const closing = server.close();
      await new Promise(resolve => setImmediate(resolve));
      expect(producer.disconnect).not.toHaveBeenCalled();

      resolveConsumer();
      await closing;
      expect(producer.disconnect).toHaveBeenCalledOnce();
    });
    it('should disconnect the producer and reset the clients when the consumer fails to disconnect', async () => {
      const error = new Error('consumer');
      consumer.disconnect.mockRejectedValue(error);

      await expect(server.close()).rejects.toBe(error);

      expect(producer.disconnect).toHaveBeenCalledOnce();
      expect(untypedServer.consumer).toBeNull();
      expect(untypedServer.producer).toBeNull();
      expect(untypedServer.client).toBeNull();
    });
    it('should reset the clients when the producer fails to disconnect', async () => {
      const error = new Error('producer');
      producer.disconnect.mockRejectedValue(error);

      await expect(server.close()).rejects.toBe(error);

      expect(consumer.disconnect).toHaveBeenCalledOnce();
      expect(untypedServer.consumer).toBeNull();
      expect(untypedServer.producer).toBeNull();
      expect(untypedServer.client).toBeNull();
    });
    it('should reject with the consumer error and log the producer error when both fail to disconnect', async () => {
      const consumerError = new Error('consumer');
      const producerError = new Error('producer');
      consumer.disconnect.mockRejectedValue(consumerError);
      producer.disconnect.mockRejectedValue(producerError);
      const logError = vi
        .spyOn(untypedServer.logger, 'error')
        .mockImplementation(() => {});

      await expect(server.close()).rejects.toBe(consumerError);

      expect(logError).toHaveBeenCalledWith(producerError);
    });
  });

  describe('bindEvents', () => {
    it('should not call subscribe nor run on consumer when there are no messageHandlers', async () => {
      untypedServer.logger = new NoopLogger();
      await server.listen(callback);
      await server.bindEvents(untypedServer.consumer);
      expect(subscribe).not.toHaveBeenCalled();
      expect(run).toHaveBeenCalled();
      expect(connect).toHaveBeenCalled();
    });
    it('should call subscribe and run on consumer when there are messageHandlers', async () => {
      untypedServer.logger = new NoopLogger();
      await server.listen(callback);

      const pattern = 'test';
      const handler = vi.fn();
      untypedServer.messageHandlers = objectToMap({
        [pattern]: handler,
      });

      await server.bindEvents(untypedServer.consumer);

      expect(subscribe).toHaveBeenCalled();
      expect(subscribe).toHaveBeenCalledWith({
        topics: [pattern],
      });

      expect(run).toHaveBeenCalled();
      expect(connect).toHaveBeenCalled();
    });
    it('should call subscribe with options and run on consumer when there are messageHandlers', async () => {
      untypedServer.logger = new NoopLogger();
      untypedServer.options.subscribe = {};
      untypedServer.options.subscribe.fromBeginning = true;
      await server.listen(callback);

      const pattern = 'test';
      const handler = vi.fn();
      untypedServer.messageHandlers = objectToMap({
        [pattern]: handler,
      });

      await server.bindEvents(untypedServer.consumer);

      expect(subscribe).toHaveBeenCalled();
      expect(subscribe).toHaveBeenCalledWith({
        topics: [pattern],
        fromBeginning: true,
      });

      expect(run).toHaveBeenCalled();
      expect(connect).toHaveBeenCalled();
    });
    it('should subscribe to regex message patterns', async () => {
      untypedServer.logger = new NoopLogger();
      await server.listen(callback);

      const pattern = /test\..*/;
      const handler = vi.fn();
      server.addHandler(pattern, handler);

      await server.bindEvents(untypedServer.consumer);

      expect(subscribe).toHaveBeenCalled();
      expect(subscribe).toHaveBeenCalledWith({
        topics: [pattern],
      });

      expect(run).toHaveBeenCalled();
      expect(connect).toHaveBeenCalled();
    });
    it('should pass run options with partitionsConsumedConcurrently to consumer.run()', async () => {
      untypedServer.logger = new NoopLogger();
      untypedServer.options.run = {
        partitionsConsumedConcurrently: 5,
      };
      await server.listen(callback);
      await server.bindEvents(untypedServer.consumer);

      expect(run).toHaveBeenCalled();
      expect(run.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          partitionsConsumedConcurrently: 5,
        }),
      );
      expect(run.mock.calls[0][0]).toHaveProperty('eachMessage');
    });
    it('should pass multiple run options to consumer.run()', async () => {
      untypedServer.logger = new NoopLogger();
      untypedServer.options.run = {
        partitionsConsumedConcurrently: 3,
        autoCommit: false,
        autoCommitInterval: 5000,
      };
      await server.listen(callback);
      await server.bindEvents(untypedServer.consumer);

      expect(run).toHaveBeenCalled();
      const callArg = run.mock.calls[0][0];
      expect(callArg).toEqual(
        expect.objectContaining({
          partitionsConsumedConcurrently: 3,
          autoCommit: false,
          autoCommitInterval: 5000,
        }),
      );
      expect(callArg).toHaveProperty('eachMessage');
    });
  });

  describe('getMessageHandler', () => {
    it(`should return function`, () => {
      expect(typeof server.getMessageHandler()).toEqual('function');
    });
    describe('handler', () => {
      it('should call "handleMessage"', async () => {
        const handleMessageStub = vi
          .spyOn(server, 'handleMessage')
          .mockImplementation(() => null!);
        await server.getMessageHandler()(null!);
        expect(handleMessageStub).toHaveBeenCalled();
      });
    });
  });

  describe('getPublisher', () => {
    const context = new KafkaContext([] as any);
    let sendMessageStub: ReturnType<typeof vi.fn>;
    let publisher;

    beforeEach(() => {
      publisher = server.getPublisher(
        replyTopic,
        replyPartition,
        correlationId,
        context,
      );
      sendMessageStub = vi
        .spyOn(server, 'sendMessage')
        .mockImplementation(async () => []);
    });
    it(`should return function`, () => {
      expect(
        typeof server.getPublisher(null!, null!, correlationId, context),
      ).toEqual('function');
    });
    it(`should call "publish" with expected arguments`, () => {
      const data = {
        id: 'uuid',
        value: 'string',
      };
      publisher(data);

      expect(sendMessageStub).toHaveBeenCalledWith(
        data,
        replyTopic,
        replyPartition,
        correlationId,
        context,
      );
    });
  });

  describe('getHandlerByPattern', () => {
    it('should chain event handlers registered with equal regex patterns', () => {
      const first = vi.fn();
      const second = vi.fn();
      server.addHandler(/test\..*/, first, true);
      server.addHandler(/test\..*/, second, true);

      expect(server.getHandlers().size).toBe(1);
      expect(server.getHandlerByPattern(topic)).toBe(first);
      expect(first.next).toBe(second);
    });

    it('should return a handler when topic matches a regex pattern', () => {
      const handler = vi.fn();
      server.addHandler(/test\..*/, handler);

      expect(server.getHandlerByPattern(topic)).toBe(handler);
    });

    it('should return the handler of a string pattern that reads as json', () => {
      const handler = vi.fn();
      server.addHandler('true', handler);

      expect(server.getHandlerByPattern('true')).toBe(handler);
    });

    it('should return null when topic does not match a regex pattern', () => {
      const handler = vi.fn();
      server.addHandler(/another\..*/, handler);

      expect(server.getHandlerByPattern(topic)).toBeNull();
    });
  });

  describe('handleMessage', () => {
    let getPublisherSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.spyOn(server, 'sendMessage').mockImplementation(async () => []);
      getPublisherSpy = vi.fn();

      vi.spyOn(server, 'getPublisher').mockImplementation(
        () => getPublisherSpy,
      );
    });

    it('should call "handleEvent" if correlation identifier is not present', async () => {
      const handleEventSpy = vi.spyOn(server, 'handleEvent');
      await server.handleMessage(eventPayload);
      expect(handleEventSpy).toHaveBeenCalled();
    });

    it('should call "handleEvent" if correlation identifier is present but the reply topic is not present', async () => {
      const handleEventSpy = vi.spyOn(server, 'handleEvent');
      await server.handleMessage(eventWithCorrelationIdPayload);
      expect(handleEventSpy).toHaveBeenCalled();
    });

    describe('packet metadata', () => {
      const handleWithHeaders = async (headers: Record<string, any>) => {
        const handleEventSpy = vi
          .spyOn(server, 'handleEvent')
          .mockResolvedValue(undefined);
        await server.handleMessage({
          ...eventPayload,
          message: { ...eventMessage, headers },
        });
        const context: KafkaContext = handleEventSpy.mock.calls[0][2];
        return context.getMetadata();
      };

      it('should expose the text headers on the context, as they arrived', async () => {
        const metadata = await handleWithHeaders({
          'x-request-id': Buffer.from('trace-1'),
          // Decoded into an object in the message the context returns
          'x-json': Buffer.from('{"a":1}'),
          plain: 'already a string',
        });

        expect(metadata).toEqual({
          'x-request-id': 'trace-1',
          'x-json': '{"a":1}',
          plain: 'already a string',
        });
      });

      it('should leave out repeated and binary headers', async () => {
        const metadata = await handleWithHeaders({
          'x-request-id': Buffer.from('trace-1'),
          'x-tag': [Buffer.from('a'), Buffer.from('b')],
          'x-binary': Buffer.from([0x00, 0xff, 0xfe]),
          'x-absent': undefined,
        });

        expect(metadata).toEqual({ 'x-request-id': 'trace-1' });
      });

      it('should be undefined for a message without headers', async () => {
        expect(await handleWithHeaders({})).toBeUndefined();
      });
    });

    it('should call event handler when "handleEvent" is called', async () => {
      const messageHandler = vi.fn();
      const context = { test: true } as any;
      const messageData = 'some data';
      vi.spyOn(server, 'getHandlerByPattern').mockImplementation(
        () => messageHandler,
      );

      await server.handleEvent(
        topic,
        { data: messageData, pattern: topic },
        context,
      );
      expect(messageHandler).toHaveBeenCalledWith(messageData, context);
    });

    it('should not catch error thrown by event handler as part of "handleEvent"', async () => {
      const error = new Error('handler error');
      const messageHandler = vi.fn().mockImplementation(() => {
        throw error;
      });
      vi.spyOn(server, 'getHandlerByPattern').mockImplementation(
        () => messageHandler,
      );

      await expect(
        server.handleEvent(
          topic,
          { data: 'some data', pattern: topic },
          {} as any,
        ),
      ).rejects.toBe(error);
    });

    it('should call "handleEvent" if correlation identifier and reply topic are present but the handler is of type eventHandler', async () => {
      const handler = vi.fn();
      (handler as any).isEventHandler = true;
      untypedServer.messageHandlers = objectToMap({
        [topic]: handler,
      });
      const handleEventSpy = vi.spyOn(server, 'handleEvent');
      await server.handleMessage(payload);
      expect(handleEventSpy).toHaveBeenCalled();
    });

    it('should NOT call "handleEvent" if correlation identifier and reply topic are present but the handler is not of type eventHandler', async () => {
      const handler = vi.fn();
      (handler as any).isEventHandler = false;
      untypedServer.messageHandlers = objectToMap({
        [topic]: handler,
      });
      const handleEventSpy = vi.spyOn(server, 'handleEvent');
      await server.handleMessage(payload);
      expect(handleEventSpy).not.toHaveBeenCalled();
    });

    it(`should publish NO_MESSAGE_HANDLER if pattern not exists in messageHandlers object`, async () => {
      await server.handleMessage(payload);
      expect(getPublisherSpy).toHaveBeenCalledWith({
        id: payload.message.headers![KafkaHeaders.CORRELATION_ID]!.toString(),
        err: NO_MESSAGE_HANDLER,
      });
    });

    it(`should call handler with expected arguments`, async () => {
      const handler = vi.fn();
      untypedServer.messageHandlers = objectToMap({
        [topic]: handler,
      });

      await server.handleMessage(payload);
      expect(handler).toHaveBeenCalled();
    });

    it('should call handler when topic matches a regex pattern', async () => {
      const handler = vi.fn();
      server.addHandler(/test\..*/, handler);

      await server.handleMessage(payload);
      expect(handler).toHaveBeenCalled();
    });

    describe('when the server receives its own reply on a regex-matched topic', () => {
      // What ServerKafka#sendMessage publishes to the reply topic
      const replyPayload: EachMessagePayload = {
        topic: replyTopic,
        partition: 0,
        message: Object.assign({}, eventMessage, {
          headers: {
            [KafkaHeaders.CORRELATION_ID]: Buffer.from(correlationId),
            [KafkaHeaders.NEST_IS_DISPOSED]: Buffer.alloc(1),
          },
        }),
        heartbeat,
        pause,
      };

      it.each([
        ['a message handler', false],
        ['an event handler', true],
      ])(
        'should not dispatch it to %s of a regex that matches the request topic',
        async (_, isEvent) => {
          const handler = vi.fn();
          server.addHandler(/^test\..+$/, handler, isEvent);

          await server.handleMessage(replyPayload);
          expect(handler).not.toHaveBeenCalled();
        },
      );

      it('should still dispatch a request published to a reply topic', async () => {
        const handler = vi.fn();
        server.addHandler(/^test\..+$/, handler);

        await server.handleMessage({
          ...replyPayload,
          message: Object.assign({}, eventMessage, {
            headers: {
              [KafkaHeaders.CORRELATION_ID]: Buffer.from(correlationId),
              [KafkaHeaders.REPLY_TOPIC]: Buffer.from(replyTopic),
            },
          }),
        });
        expect(handler).toHaveBeenCalled();
      });

      it('should still call a regex handler that targets reply topics', async () => {
        const handler = vi.fn();
        server.addHandler(/\.reply$/, handler, true);

        await server.handleMessage(replyPayload);
        expect(handler).toHaveBeenCalled();
      });

      it('should still call the handler registered for the reply topic', async () => {
        const regexHandler = vi.fn();
        const handler = vi.fn();
        server.addHandler(/^test\..+$/, regexHandler, true);
        server.addHandler(replyTopic, handler, true);

        await server.handleMessage(replyPayload);
        expect(handler).toHaveBeenCalled();
        expect(regexHandler).not.toHaveBeenCalled();
      });

      it('should still call a regex handler for a message without a correlation id', async () => {
        const handler = vi.fn();
        server.addHandler(/^test\..+$/, handler, true);

        await server.handleMessage({ ...eventPayload, topic: replyTopic });
        expect(handler).toHaveBeenCalled();
      });
    });

    describe('when the reply topic is not a valid topic name', () => {
      const withReplyTopic = (
        replyTopicHeader: string,
      ): EachMessagePayload => ({
        ...payload,
        message: {
          ...message,
          headers: {
            ...message.headers,
            [KafkaHeaders.REPLY_TOPIC]: Buffer.from(replyTopicHeader),
          },
        },
      });
      let loggerErrorSpy: ReturnType<typeof vi.spyOn>;

      beforeEach(() => {
        loggerErrorSpy = vi
          .spyOn(untypedServer.logger, 'error')
          .mockImplementation(() => {});
      });

      it.each([
        ['an object', '{}'],
        ['an array', '["test.topic.reply"]'],
        ['a schema payload', '\0test.topic.reply'],
        ['too long', 'a'.repeat(250)],
        ['made of illegal characters', 'test topic/reply'],
      ])(
        'should log an error and not run the handler if it is %s',
        async (_, replyTopicHeader) => {
          const handler = vi.fn();
          untypedServer.messageHandlers = objectToMap({
            [topic]: handler,
          });
          const handleEventSpy = vi.spyOn(server, 'handleEvent');

          await server.handleMessage(withReplyTopic(replyTopicHeader));

          expect(loggerErrorSpy).toHaveBeenCalledOnce();
          expect(handler).not.toHaveBeenCalled();
          expect(handleEventSpy).not.toHaveBeenCalled();
          expect(getPublisherSpy).not.toHaveBeenCalled();
        },
      );

      it('should not publish NO_MESSAGE_HANDLER', async () => {
        await server.handleMessage(withReplyTopic('{}'));

        expect(loggerErrorSpy).toHaveBeenCalledOnce();
        expect(getPublisherSpy).not.toHaveBeenCalled();
      });
    });

    it('should reply with the correlation id as text', async () => {
      const jsonCorrelationId = '{"length":200000000}';
      const getPublisher = vi.spyOn(server, 'getPublisher');
      untypedServer.messageHandlers = objectToMap({
        [topic]: vi.fn(),
      });

      await server.handleMessage({
        ...payload,
        message: {
          ...message,
          headers: {
            ...message.headers,
            [KafkaHeaders.CORRELATION_ID]: Buffer.from(jsonCorrelationId),
          },
        },
      });

      expect(getPublisher).toHaveBeenCalledWith(
        replyTopic,
        replyPartition,
        jsonCorrelationId,
        expect.any(KafkaContext),
      );
    });

    it('should log and skip a message that the parser rejects', async () => {
      untypedServer.parser = {
        parse: () => {
          throw new MaxPacketLengthExceededException(17);
        },
      };
      const handler = vi.fn();
      untypedServer.messageHandlers = objectToMap({
        [topic]: handler,
      });
      const loggerErrorSpy = vi
        .spyOn(untypedServer.logger, 'error')
        .mockImplementation(() => {});

      // A rejection would make kafkajs redeliver the message
      await expect(server.handleMessage(payload)).resolves.toBeUndefined();

      expect(loggerErrorSpy).toHaveBeenCalledOnce();
      expect(handler).not.toHaveBeenCalled();
      expect(getPublisherSpy).not.toHaveBeenCalled();
    });
  });

  function bindHandler(
    handler: (...args: any[]) => unknown,
    { isEventHandler }: { isEventHandler: boolean },
  ) {
    const endHook = vi.fn();
    untypedServer.onProcessingStartHook = (
      _transportId: unknown,
      _ctx: unknown,
      fn: () => Promise<void>,
    ) => fn();
    untypedServer.onProcessingEndHook = endHook;
    untypedServer.messageHandlers = objectToMap({
      [topic]: Object.assign(handler, { isEventHandler }),
    });
    return endHook;
  }

  describe('handleEvent', () => {
    const context = new KafkaContext([] as any);

    it('should run the end hook when the handler returns a plain value', async () => {
      const endHook = bindHandler(async () => 'plain', {
        isEventHandler: true,
      });

      await server.handleEvent(topic, { pattern: topic, data: null }, context);

      expect(endHook).toHaveBeenCalledOnce();
    });

    it('should run the end hook when the returned stream completes', async () => {
      const endHook = bindHandler(async () => of('streamed'), {
        isEventHandler: true,
      });

      await server.handleEvent(topic, { pattern: topic, data: null }, context);

      expect(endHook).toHaveBeenCalledOnce();
    });

    it('should run the end hook when the returned stream completes without emitting', async () => {
      const endHook = bindHandler(async () => EMPTY, {
        isEventHandler: true,
      });

      // A rejection would make kafkajs redeliver a message that was handled.
      await server.handleEvent(topic, { pattern: topic, data: null }, context);

      expect(endHook).toHaveBeenCalledOnce();
    });

    it('should run the end hook when the returned stream fails', async () => {
      const endHook = bindHandler(
        async () => throwError(() => new Error('failed')),
        { isEventHandler: true },
      );

      // The rejection has to travel on so that kafkajs can report it.
      await expect(
        server.handleEvent(topic, { pattern: topic, data: null }, context),
      ).rejects.toThrow('failed');
      expect(endHook).toHaveBeenCalledOnce();
    });

    it('should run the end hook when the handler throws an error', async () => {
      const endHook = bindHandler(
        async () => {
          throw new Error('handler failed');
        },
        { isEventHandler: true },
      );

      await expect(
        server.handleEvent(topic, { pattern: topic, data: null }, context),
      ).rejects.toThrow('handler failed');
      expect(endHook).toHaveBeenCalledOnce();
    });

    it('should run the end hook once per event', async () => {
      const endHook = bindHandler(async () => of('first', 'second'), {
        isEventHandler: true,
      });

      await server.handleEvent(topic, { pattern: topic, data: null }, context);

      expect(endHook).toHaveBeenCalledOnce();
    });
  });

  describe('handleMessage (request-response)', () => {
    let producerSend: ReturnType<typeof vi.fn>;

    // `Server#send` drains its queue on `process.nextTick`, so the replies are
    // published after `handleMessage` has already resolved.
    const flushPublishes = () => new Promise(resolve => setImmediate(resolve));

    beforeEach(() => {
      // The end hook used to live in `sendMessage`, so the real one has to run
      // for these specs to observe how often it fires.
      producerSend = vi.fn(async () => []);
      untypedServer.producer = { send: producerSend };
    });

    it('should run the end hook when the handler returns a plain value', async () => {
      const endHook = bindHandler(async () => 'plain', {
        isEventHandler: false,
      });

      await server.handleMessage(payload);
      await flushPublishes();

      expect(endHook).toHaveBeenCalledOnce();
      // The span closes once processing has settled, before the reply is
      // produced to Kafka, in line with the other transports.
      expect(endHook.mock.invocationCallOrder[0]).toBeLessThan(
        producerSend.mock.invocationCallOrder[0],
      );
    });

    it('should run the end hook once for a stream of several responses', async () => {
      const endHook = bindHandler(async () => of('first', 'second', 'third'), {
        isEventHandler: false,
      });

      await server.handleMessage(payload);
      await flushPublishes();

      // Three replies are published, but the span they belong to closes once,
      // before the first of them is produced.
      expect(producerSend).toHaveBeenCalledTimes(3);
      expect(endHook).toHaveBeenCalledOnce();
      expect(endHook.mock.invocationCallOrder[0]).toBeLessThan(
        producerSend.mock.invocationCallOrder[0],
      );
    });

    it('should run the end hook when the returned stream completes without emitting', async () => {
      const endHook = bindHandler(async () => EMPTY, {
        isEventHandler: false,
      });

      await server.handleMessage(payload);
      await flushPublishes();

      expect(endHook).toHaveBeenCalledOnce();
    });

    it('should run the end hook when the returned stream fails', async () => {
      const endHook = bindHandler(
        async () => throwError(() => new Error('failed')),
        { isEventHandler: false },
      );

      await server.handleMessage(payload);
      await flushPublishes();

      expect(endHook).toHaveBeenCalledOnce();
    });

    it('should run the end hook when the handler throws an error', async () => {
      const endHook = bindHandler(
        async () => {
          throw new Error('handler failed');
        },
        { isEventHandler: false },
      );

      await server.handleMessage(payload);
      await flushPublishes();

      expect(endHook).toHaveBeenCalledOnce();
    });

    it('should run the end hook when the handler throws a retriable exception', async () => {
      const endHook = bindHandler(
        async () => {
          throw new KafkaRetriableException('retry me');
        },
        { isEventHandler: false },
      );

      // The rejection has to travel on so that kafkajs redelivers the message.
      await expect(server.handleMessage(payload)).rejects.toThrow(
        KafkaRetriableException,
      );
      await flushPublishes();

      expect(producerSend).not.toHaveBeenCalled();
      expect(endHook).toHaveBeenCalledOnce();
    });

    it('should reject with a retriable exception that passed through the exception filter', async () => {
      const exceptionHandler = new RpcExceptionsHandler();
      const endHook = bindHandler(
        () =>
          exceptionHandler.handle(
            new KafkaRetriableException('retry me'),
            null!,
          ),
        { isEventHandler: false },
      );

      // The rejection has to travel on so that kafkajs redelivers the message.
      await expect(server.handleMessage(payload)).rejects.toThrow(
        KafkaRetriableException,
      );
      await flushPublishes();

      expect(producerSend).not.toHaveBeenCalled();
      expect(endHook).toHaveBeenCalledOnce();
    });

    it('should not run the end hook when there is no message handler', async () => {
      const endHook = bindHandler(async () => 'plain', {
        isEventHandler: false,
      });
      untypedServer.messageHandlers = objectToMap({});

      await server.handleMessage(payload);
      await flushPublishes();

      expect(endHook).not.toHaveBeenCalled();
    });

    it('should mark a completion that comes after the replies as carrying no response', async () => {
      const completion$ = new Subject<never>();
      bindHandler(async () => concat(of('first'), completion$), {
        isEventHandler: false,
      });

      await server.handleMessage(payload);
      await flushPublishes();
      // The stream completes once its reply has already been produced
      completion$.complete();
      await flushPublishes();

      expect(producerSend).toHaveBeenCalledTimes(2);
      const [reply] = producerSend.mock.calls[0][0].messages;
      const [completion] = producerSend.mock.calls[1][0].messages;
      expect(reply.value).toBe('first');
      expect(reply.headers).not.toHaveProperty(KafkaHeaders.NEST_NO_RESPONSE);
      expect(completion.value).toBeNull();
      expect(completion.headers).toHaveProperty(KafkaHeaders.NEST_IS_DISPOSED);
      expect(completion.headers).toHaveProperty(KafkaHeaders.NEST_NO_RESPONSE);
    });

    it('should still reply null to a stream that completes without emitting', async () => {
      bindHandler(async () => EMPTY, { isEventHandler: false });

      await server.handleMessage(payload);
      await flushPublishes();

      expect(producerSend).toHaveBeenCalledOnce();
      const [reply] = producerSend.mock.calls[0][0].messages;
      expect(reply.value).toBeNull();
      expect(reply.headers).toHaveProperty(KafkaHeaders.NEST_IS_DISPOSED);
      expect(reply.headers).not.toHaveProperty(KafkaHeaders.NEST_NO_RESPONSE);
    });

    it('should log a failed publish and still run the end hook once', async () => {
      const error = new Error('broker down');
      const loggerErrorSpy = vi
        .spyOn(untypedServer.logger, 'error')
        .mockImplementation(() => {});
      producerSend.mockRejectedValueOnce(error);
      const endHook = bindHandler(async () => 'plain', {
        isEventHandler: false,
      });

      await server.handleMessage(payload);
      await flushPublishes();

      expect(loggerErrorSpy).toHaveBeenCalledExactlyOnceWith(error);
      expect(endHook).toHaveBeenCalledOnce();
    });
  });

  describe('sendMessage', () => {
    const context = new KafkaContext([] as any);
    let sendSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      sendSpy = vi.fn().mockImplementation(() => Promise.resolve());
      vi.spyOn(server as any, 'producer', 'get').mockReturnValue({
        send: sendSpy,
      });
    });

    it('should send message', async () => {
      await server.sendMessage(
        {
          id: correlationId,
          response: messageValue,
        },
        replyTopic,
        replyPartition,
        correlationId,
        context,
      );

      expect(sendSpy).toHaveBeenCalledWith({
        topic: replyTopic,
        messages: [
          {
            partition: parseFloat(replyPartition),
            value: messageValue,
            headers: {
              [KafkaHeaders.CORRELATION_ID]: Buffer.from(correlationId),
            },
          },
        ],
      });
    });
    it('should send message without reply partition', async () => {
      await server.sendMessage(
        {
          id: correlationId,
          response: messageValue,
        },
        replyTopic,
        undefined,
        correlationId,
        context,
      );

      expect(sendSpy).toHaveBeenCalledWith({
        topic: replyTopic,
        messages: [
          {
            value: messageValue,
            headers: {
              [KafkaHeaders.CORRELATION_ID]: Buffer.from(correlationId),
            },
          },
        ],
      });
    });
    it('should send error message', async () => {
      await server.sendMessage(
        {
          id: correlationId,
          err: NO_MESSAGE_HANDLER,
        },
        replyTopic,
        replyPartition,
        correlationId,
        context,
      );

      expect(sendSpy).toHaveBeenCalledWith({
        topic: replyTopic,
        messages: [
          {
            value: null,
            partition: parseFloat(replyPartition),
            headers: {
              [KafkaHeaders.CORRELATION_ID]: Buffer.from(correlationId),
              [KafkaHeaders.NEST_ERR]: Buffer.from(NO_MESSAGE_HANDLER),
            },
          },
        ],
      });
    });
    it('should send `isDisposed` message', async () => {
      await server.sendMessage(
        {
          id: correlationId,
          isDisposed: true,
        },
        replyTopic,
        replyPartition,
        correlationId,
        context,
      );

      expect(sendSpy).toHaveBeenCalledWith({
        topic: replyTopic,
        messages: [
          {
            value: null,
            partition: parseFloat(replyPartition),
            headers: {
              [KafkaHeaders.CORRELATION_ID]: Buffer.from(correlationId),
              [KafkaHeaders.NEST_IS_DISPOSED]: Buffer.alloc(1),
              [KafkaHeaders.NEST_NO_RESPONSE]: Buffer.alloc(1),
            },
          },
        ],
      });
    });
    it('should send `isDisposed` message with its response', async () => {
      await server.sendMessage(
        {
          id: correlationId,
          // what a handler that returns nothing replies with
          response: undefined,
          isDisposed: true,
        },
        replyTopic,
        replyPartition,
        correlationId,
        context,
      );

      expect(sendSpy).toHaveBeenCalledWith({
        topic: replyTopic,
        messages: [
          {
            value: null,
            partition: parseFloat(replyPartition),
            headers: {
              [KafkaHeaders.CORRELATION_ID]: Buffer.from(correlationId),
              [KafkaHeaders.NEST_IS_DISPOSED]: Buffer.alloc(1),
            },
          },
        ],
      });
    });
  });

  describe('createClient', () => {
    it('should accept a custom logCreator in client options', async () => {
      const logCreatorSpy = vi.fn(() => 'test');
      const logCreator = () => logCreatorSpy;

      server = new ServerKafka({
        client: {
          brokers: [],
          logCreator,
        },
      });

      const kafkaClient = await server.createClient();
      const logger = kafkaClient.logger();

      logger.info({ namespace: '', level: 1, log: 'test' });

      expect(logCreatorSpy).toHaveBeenCalled();
    });
  });
});
