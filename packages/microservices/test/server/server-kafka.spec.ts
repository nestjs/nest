import { Logger } from '@nestjs/common';
import { NO_MESSAGE_HANDLER } from '../../constants.js';
import { KafkaContext } from '../../ctx-host/index.js';
import { KafkaHeaders } from '../../enums/index.js';
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

      await server.listen(err => console.log(err));
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
