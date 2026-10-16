import { Logger } from '@nestjs/common';
import { EMPTY, of, throwError } from 'rxjs';
import { NO_MESSAGE_HANDLER } from '../../constants.js';
import { KafkaContext } from '../../ctx-host/index.js';
import { KafkaHeaders } from '../../enums/index.js';
import { KafkaRetriableException } from '../../exceptions/index.js';
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
    const consumer = { disconnect: vi.fn() };
    const producer = { disconnect: vi.fn() };
    beforeEach(() => {
      untypedServer.consumer = consumer;
      untypedServer.producer = producer;
    });
    it('should close server', async () => {
      await server.close();

      expect(consumer.disconnect).toHaveBeenCalledOnce();
      expect(producer.disconnect).toHaveBeenCalledOnce();
      expect(untypedServer.consumer).toBeNull();
      expect(untypedServer.producer).toBeNull();
      expect(untypedServer.client).toBeNull();
    });
  });

  describe('unwrap', () => {
    it('should throw if the client is not initialized', () => {
      expect(() => server.unwrap()).toThrow();
    });

    it('should return the client, consumer, producer, and an empty consumers map', () => {
      const client = {} as any;
      const consumer = {} as any;
      const producer = {} as any;
      untypedServer.client = client;
      untypedServer.consumer = consumer;
      untypedServer.producer = producer;

      const [
        unwrappedClient,
        unwrappedConsumer,
        unwrappedProducer,
        unwrappedConsumers,
      ] = server.unwrap<[any, any, any, Map<string | RegExp, any>]>();

      expect(unwrappedClient).toBe(client);
      expect(unwrappedConsumer).toBe(consumer);
      expect(unwrappedProducer).toBe(producer);
      expect(unwrappedConsumers).toBeInstanceOf(Map);
      expect(unwrappedConsumers.size).toEqual(0);
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

      it('should forward the given consumer to "handleMessage"', async () => {
        const handleMessageStub = vi
          .spyOn(server, 'handleMessage')
          .mockImplementation(() => null!);
        const perTopicConsumer = { id: 'per-topic-consumer' } as any;

        await server.getMessageHandler(perTopicConsumer)(null!);

        expect(handleMessageStub).toHaveBeenCalledWith(null, perTopicConsumer);
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
    it('should return a handler when topic matches a regex pattern', () => {
      const handler = vi.fn();
      server.addHandler(/test\..*/, handler);

      expect(server.getHandlerByPattern(topic)).toBe(handler);
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

    it('should bind the given consumer to the KafkaContext for a string pattern', async () => {
      const handler = vi.fn();
      untypedServer.messageHandlers = objectToMap({
        [topic]: handler,
      });
      const perTopicConsumer = { id: 'per-topic-consumer' } as any;

      await server.handleMessage(payload, perTopicConsumer);

      const context = handler.mock.calls[0][1] as KafkaContext;
      expect(context.getConsumer()).toBe(perTopicConsumer);
    });

    it('should bind the given consumer to the KafkaContext for a RegExp pattern', async () => {
      const handler = vi.fn();
      server.addHandler(/test\..*/, handler);
      const perTopicConsumer = { id: 'per-topic-consumer' } as any;

      await server.handleMessage(payload, perTopicConsumer);

      const context = handler.mock.calls[0][1] as KafkaContext;
      expect(context.getConsumer()).toBe(perTopicConsumer);
    });

    it('should fall back to the shared consumer when none is provided', async () => {
      const handler = vi.fn();
      untypedServer.messageHandlers = objectToMap({
        [topic]: handler,
      });
      const sharedConsumer = { id: 'shared-consumer' } as any;
      untypedServer.consumer = sharedConsumer;

      await server.handleMessage(payload);

      const context = handler.mock.calls[0][1] as KafkaContext;
      expect(context.getConsumer()).toBe(sharedConsumer);
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
            },
          },
        ],
      });
    });
  });

  describe('topicConsumers mode', () => {
    const mockConsumerEvents = {
      CONNECT: 'consumer.connect',
      DISCONNECT: 'consumer.disconnect',
      STOP: 'consumer.stop',
      CRASH: 'consumer.crash',
      REBALANCING: 'consumer.rebalancing',
    };

    let perTopicServer: ServerKafka;
    let perTopicUntyped: any;
    let perTopicConnect: ReturnType<typeof vi.fn>;
    let perTopicSubscribe: ReturnType<typeof vi.fn>;
    let perTopicRun: ReturnType<typeof vi.fn>;
    let perTopicOn: ReturnType<typeof vi.fn>;
    let perTopicConsumerFactory: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      perTopicServer = new ServerKafka({ topicConsumers: true });
      perTopicUntyped = perTopicServer as any;

      perTopicConnect = vi.fn();
      perTopicSubscribe = vi.fn();
      perTopicRun = vi.fn();
      perTopicOn = vi.fn();

      const mockConsumer = () => ({
        connect: perTopicConnect,
        subscribe: perTopicSubscribe,
        run: perTopicRun,
        on: perTopicOn,
        events: mockConsumerEvents,
      });

      perTopicConsumerFactory = vi.fn().mockImplementation(mockConsumer);

      vi.spyOn(perTopicServer, 'createClient').mockImplementation(
        async () =>
          ({
            consumer: perTopicConsumerFactory,
            producer: vi.fn().mockReturnValue({
              connect: perTopicConnect,
              send: vi.fn(),
              on: perTopicOn,
              events: {
                CONNECT: 'producer.connect',
                DISCONNECT: 'producer.disconnect',
              },
            }),
          }) as any,
      );
    });

    afterEach(() => vi.restoreAllMocks());

    describe('bindEventsPerTopic', () => {
      it('should create a separate consumer for each registered topic', async () => {
        perTopicUntyped.messageHandlers = objectToMap({
          'topic-a': vi.fn(),
          'topic-b': vi.fn(),
        });

        await perTopicServer.listen(vi.fn());

        expect(perTopicConsumerFactory).toHaveBeenCalledTimes(2);
      });

      it('should suffix groupId with topic name for each consumer', async () => {
        perTopicUntyped.messageHandlers = objectToMap({
          'topic-a': vi.fn(),
          'topic-b': vi.fn(),
        });

        await perTopicServer.listen(vi.fn());

        const groupIds = perTopicConsumerFactory.mock.calls.map(
          args => args[0].groupId,
        );
        expect(groupIds.some(id => id.endsWith('-topic-a'))).toBe(true);
        expect(groupIds.some(id => id.endsWith('-topic-b'))).toBe(true);
      });

      it('should subscribe each consumer to exactly one topic', async () => {
        perTopicUntyped.messageHandlers = objectToMap({
          'topic-a': vi.fn(),
          'topic-b': vi.fn(),
        });

        await perTopicServer.listen(vi.fn());

        expect(perTopicSubscribe).toHaveBeenCalledTimes(2);
        perTopicSubscribe.mock.calls.forEach(args => {
          expect(args[0].topics.length).toEqual(1);
        });
        const subscribedTopics = perTopicSubscribe.mock.calls
          .map(args => args[0].topics[0])
          .sort();
        expect(subscribedTopics).toEqual(['topic-a', 'topic-b']);
      });

      it('should call run on each per-topic consumer', async () => {
        perTopicUntyped.messageHandlers = objectToMap({
          'topic-a': vi.fn(),
          'topic-b': vi.fn(),
        });

        await perTopicServer.listen(vi.fn());

        expect(perTopicRun).toHaveBeenCalledTimes(2);
        perTopicRun.mock.calls.forEach(args => {
          expect(args[0]).toHaveProperty('eachMessage');
        });
      });

      it('should populate consumers map with one entry per topic', async () => {
        perTopicUntyped.messageHandlers = objectToMap({
          'topic-a': vi.fn(),
          'topic-b': vi.fn(),
        });

        await perTopicServer.listen(vi.fn());

        expect(perTopicUntyped.consumers.size).toEqual(2);
        expect(perTopicUntyped.consumers.has('topic-a')).toBe(true);
        expect(perTopicUntyped.consumers.has('topic-b')).toBe(true);
      });

      it('should not create any consumer when there are no messageHandlers', async () => {
        await perTopicServer.listen(vi.fn());

        expect(perTopicConsumerFactory).not.toHaveBeenCalled();
        expect(perTopicUntyped.consumers.size).toEqual(0);
      });

      it('should clean up connected consumers and rethrow when a topic connect fails', async () => {
        const disconnectOk = vi.fn();
        const connectError = new Error('connect failed');
        let callCount = 0;

        perTopicConsumerFactory.mockImplementation(() => ({
          connect: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 2) throw connectError;
          }),
          subscribe: vi.fn(),
          run: vi.fn(),
          on: perTopicOn,
          events: mockConsumerEvents,
          disconnect: disconnectOk,
        }));

        perTopicUntyped.messageHandlers = objectToMap({
          'topic-a': vi.fn(),
          'topic-b': vi.fn(),
        });

        const cb = vi.fn();
        await perTopicServer.listen(cb);

        expect(cb).toHaveBeenCalledWith(connectError);
        expect(disconnectOk).toHaveBeenCalledOnce();
        expect(perTopicUntyped.consumers.size).toEqual(0);
      });

      it('should bind each per-topic consumer instance to its own message handler', async () => {
        const getMessageHandlerSpy = vi.spyOn(
          perTopicServer,
          'getMessageHandler',
        );
        perTopicUntyped.messageHandlers = objectToMap({
          'topic-a': vi.fn(),
          'topic-b': vi.fn(),
        });

        await perTopicServer.listen(vi.fn());

        expect(getMessageHandlerSpy).toHaveBeenCalledWith(
          perTopicUntyped.consumers.get('topic-a'),
        );
        expect(getMessageHandlerSpy).toHaveBeenCalledWith(
          perTopicUntyped.consumers.get('topic-b'),
        );
      });

      it('should create and subscribe a dedicated consumer for a RegExp topic pattern', async () => {
        const pattern = /^topic-c\..*/;
        perTopicUntyped.messageHandlers = new Map([[pattern, vi.fn()]]);

        await perTopicServer.listen(vi.fn());

        expect(perTopicSubscribe).toHaveBeenCalledWith(
          expect.objectContaining({ topics: [pattern] }),
        );
        expect(perTopicUntyped.consumers.has(pattern)).toBe(true);
      });
    });

    describe('close with topicConsumers', () => {
      it('should disconnect all per-topic consumers and null refs', async () => {
        const disconnectA = vi.fn();
        const disconnectB = vi.fn();
        perTopicUntyped.consumers = new Map([
          ['topic-a', { disconnect: disconnectA }],
          ['topic-b', { disconnect: disconnectB }],
        ]);
        perTopicUntyped.producer = { disconnect: vi.fn() };

        await perTopicServer.close();

        expect(disconnectA).toHaveBeenCalledOnce();
        expect(disconnectB).toHaveBeenCalledOnce();
        expect(perTopicUntyped.consumers.size).toEqual(0);
        expect(perTopicUntyped.producer).toBeNull();
        expect(perTopicUntyped.client).toBeNull();
      });
    });

    describe('unwrap with topicConsumers', () => {
      it('should return the client, a null consumer, the producer, and the per-topic consumers map', async () => {
        perTopicUntyped.messageHandlers = objectToMap({
          'topic-a': vi.fn(),
        });

        await perTopicServer.listen(vi.fn());

        const [client, consumer, producer, consumers] =
          perTopicServer.unwrap<[any, any, any, Map<string | RegExp, any>]>();

        expect(client).toBeDefined();
        expect(consumer).toBeNull();
        expect(producer).toBeDefined();
        expect(consumers).toBeInstanceOf(Map);
        expect(consumers.size).toEqual(1);
        expect(consumers.has('topic-a')).toBe(true);
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
