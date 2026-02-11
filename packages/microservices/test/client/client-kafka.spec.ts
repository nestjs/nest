import { Producer } from 'kafkajs';
import { Observable } from 'rxjs';
import { ClientKafka } from '../../client/client-kafka.js';
import { NO_MESSAGE_HANDLER } from '../../constants.js';
import { KafkaHeaders } from '../../enums/index.js';
import { InvalidKafkaClientTopicException } from '../../errors/invalid-kafka-client-topic.exception.js';
import {
  ConsumerGroupJoinEvent,
  EachMessagePayload,
  KafkaMessage,
} from '../../external/kafka.interface.js';

describe('ClientKafka', () => {
  const topic = 'test.topic';
  const partition = 0;
  const replyTopic = 'test.topic.reply';
  const replyPartition = '0';
  const correlationId = '696fa0a9-1827-4e59-baef-f3628173fe4f';
  const key = 'test-key';
  const offset = '0';
  const timestamp = new Date().toISOString();
  const attributes = 1;
  const messageValue = 'test-message';
  const heartbeat = async () => {};
  const pause = () => () => {};

  const message: KafkaMessage = {
    key: Buffer.from(key),
    offset,
    size: messageValue.length,
    value: Buffer.from(messageValue),
    timestamp,
    attributes,
  };

  const deserializedMessage: any = {
    key,
    offset,
    size: messageValue.length,
    value: messageValue,
    timestamp,
    attributes,
    topic,
    partition,
  };

  const payload: EachMessagePayload = {
    topic,
    partition,
    message: Object.assign(
      {
        headers: {
          [KafkaHeaders.CORRELATION_ID]: Buffer.from(correlationId),
        },
      },
      message,
    ),
    heartbeat,
    pause,
  };

  const payloadDisposed: EachMessagePayload = {
    topic,
    partition,
    message: Object.assign(
      {
        headers: {
          [KafkaHeaders.CORRELATION_ID]: Buffer.from(correlationId),
          [KafkaHeaders.NEST_IS_DISPOSED]: Buffer.alloc(1),
        },
      },
      message,
      {
        size: 0,
        value: Buffer.from(JSON.stringify({ test: true })),
      },
    ),
    heartbeat,
    pause,
  };

  const payloadError: EachMessagePayload = {
    topic,
    partition,
    message: Object.assign(
      {
        headers: {
          [KafkaHeaders.CORRELATION_ID]: Buffer.from(correlationId),
          [KafkaHeaders.NEST_ERR]: Buffer.from(NO_MESSAGE_HANDLER),
        },
      },
      message,
      {
        size: 0,
        value: null,
      },
    ),
    heartbeat,
    pause,
  };

  const payloadWithoutCorrelation: EachMessagePayload = {
    topic,
    partition,
    message: Object.assign(
      {
        headers: {},
      },
      message,
    ),
    heartbeat,
    pause,
  };

  // deserialized payload
  const deserializedPayload: EachMessagePayload = {
    topic,
    partition,
    message: Object.assign(
      {
        headers: {
          [KafkaHeaders.CORRELATION_ID]: correlationId,
        },
      },
      deserializedMessage,
    ),
    heartbeat,
    pause,
  };

  const deserializedPayloadDisposed: EachMessagePayload = {
    topic,
    partition,
    message: Object.assign(
      {
        headers: {
          [KafkaHeaders.CORRELATION_ID]: correlationId,
          [KafkaHeaders.NEST_IS_DISPOSED]: Buffer.alloc(1).toString(),
        },
      },
      deserializedMessage,
      {
        size: 0,
        value: { test: true },
      },
    ),
    heartbeat,
    pause,
  };

  let client: ClientKafka;
  let untypedClient: any;
  let callback: ReturnType<typeof vi.fn>;
  let connect: ReturnType<typeof vi.fn>;
  let subscribe: ReturnType<typeof vi.fn>;
  let run: ReturnType<typeof vi.fn>;
  let send: ReturnType<typeof vi.fn>;
  let on: ReturnType<typeof vi.fn>;
  let consumerStub: ReturnType<typeof vi.fn>;
  let producerStub: ReturnType<typeof vi.fn>;
  let createClientStub: ReturnType<typeof vi.fn>;
  let kafkaClient: any;

  beforeEach(() => {
    client = new ClientKafka({});
    untypedClient = client as any;

    callback = vi.fn();
    connect = vi.fn();
    subscribe = vi.fn();
    run = vi.fn();
    send = vi.fn();
    on = vi.fn();

    consumerStub = vi.fn().mockImplementation(() => {
      return {
        connect,
        subscribe,
        run,
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
        on,
      };
    });
    producerStub = vi.fn().mockImplementation(() => {
      return {
        connect,
        send,
        events: {
          CONNECT: 'producer.connect',
          DISCONNECT: 'producer.disconnect',
          REQUEST: 'producer.network.request',
          REQUEST_TIMEOUT: 'producer.network.request_timeout',
          REQUEST_QUEUE_SIZE: 'producer.network.request_queue_size',
        },
        on,
      };
    });
    kafkaClient = {
      consumer: consumerStub,
      producer: producerStub,
    };

    createClientStub = vi
      .spyOn(client, 'createClient')
      .mockImplementation(() => kafkaClient);
  });

  describe('createClient', () => {
    beforeEach(() => {
      client = new ClientKafka({});
    });

    it(`should accept a custom logCreator in client options`, async () => {
      const logCreatorSpy = vi.fn().mockReturnValue('test');
      const logCreator = () => logCreatorSpy;

      client = new ClientKafka({
        client: {
          brokers: [],
          logCreator,
        },
      });

      const kafkaClient = await client.createClient();
      const logger = kafkaClient.logger();

      logger.info({ namespace: '', level: 1, log: 'test' });

      expect(logCreatorSpy).toHaveBeenCalled();
    });
  });

  describe('subscribeToResponseOf', () => {
    let normalizePatternSpy: ReturnType<typeof vi.spyOn>;
    let getResponsePatternNameSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      normalizePatternSpy = vi.spyOn(client as any, 'normalizePattern');
      getResponsePatternNameSpy = vi.spyOn(
        client as any,
        'getResponsePatternName',
      );
    });

    it(`should create an array of response patterns`, () => {
      client.subscribeToResponseOf(topic);

      expect(normalizePatternSpy).toHaveBeenCalledWith(topic);
      expect(getResponsePatternNameSpy).toHaveBeenCalledWith(topic);
      expect(client['responsePatterns']).not.toHaveLength(0);
      expect(client['responsePatterns'][0]).toEqual(replyTopic);
    });

    afterEach(() => {
      normalizePatternSpy.mockRestore();
    });
  });

  describe('close', () => {
    const consumer = { disconnect: vi.fn().mockResolvedValue(undefined) };
    const producer = { disconnect: vi.fn().mockResolvedValue(undefined) };
    beforeEach(() => {
      untypedClient._consumer = consumer;
      untypedClient._producer = producer;
    });
    it('should close server', async () => {
      await client.close();

      expect(consumer.disconnect).toHaveBeenCalledOnce();
      expect(producer.disconnect).toHaveBeenCalledOnce();
      expect(untypedClient._consumer).toBeNull();
      expect(untypedClient._producer).toBeNull();
      expect(untypedClient.client).toBeNull();
    });
  });

  describe('connect', () => {
    let consumerAssignmentsStub: any;
    let bindTopicsStub: ReturnType<typeof vi.fn>;

    describe('consumer and producer', () => {
      beforeEach(() => {
        consumerAssignmentsStub = (client as any).consumerAssignments;
        bindTopicsStub = vi
          .spyOn(client, 'bindTopics')
          .mockImplementation(async () => {});
      });

      it('should expect the connection to be created', async () => {
        const connection = await client.connect();

        expect(createClientStub).toHaveBeenCalledOnce();
        expect(producerStub).toHaveBeenCalledOnce();
        expect(consumerStub).toHaveBeenCalledOnce();
        expect(on).toHaveBeenCalled();
        expect(client['consumerAssignments']).toEqual({});
        expect(connect).toHaveBeenCalledTimes(2);
        expect(bindTopicsStub).toHaveBeenCalledOnce();
        expect(connection).toEqual(producerStub());
      });

      it('should expect the connection to be reused', async () => {
        untypedClient.initialized = Promise.resolve({});

        await client.connect();

        expect(createClientStub).not.toHaveBeenCalled();
        expect(producerStub).not.toHaveBeenCalled();
        expect(consumerStub).not.toHaveBeenCalled();

        expect(on).not.toHaveBeenCalled();
        expect(client['consumerAssignments']).toEqual({});

        expect(connect).not.toHaveBeenCalledTimes(2);

        expect(bindTopicsStub).not.toHaveBeenCalled();
      });
    });

    describe('producer only mode', () => {
      beforeEach(() => {
        consumerAssignmentsStub = (client as any).consumerAssignments;
        bindTopicsStub = vi
          .spyOn(client, 'bindTopics')
          .mockImplementation(async () => {});
        client['producerOnlyMode'] = true;
      });

      it('should expect the connection to be created', async () => {
        const connection = await client.connect();

        expect(createClientStub).toHaveBeenCalledOnce();
        expect(producerStub).toHaveBeenCalledOnce();

        expect(consumerStub).not.toHaveBeenCalled();

        expect(client['consumerAssignments']).toEqual({});

        expect(connect).toHaveBeenCalledOnce();

        expect(bindTopicsStub).not.toHaveBeenCalled();
        expect(connection).toEqual(producerStub());
      });

      it('should expect the connection to be reused', async () => {
        untypedClient.initialized = Promise.resolve({});

        await client.connect();

        expect(createClientStub).not.toHaveBeenCalled();
        expect(producerStub).not.toHaveBeenCalled();
        expect(consumerStub).not.toHaveBeenCalled();

        expect(on).not.toHaveBeenCalled();
        expect(client['consumerAssignments']).toEqual({});

        expect(connect).not.toHaveBeenCalledTimes(2);

        expect(bindTopicsStub).not.toHaveBeenCalled();
      });
    });
  });

  describe('setConsumerAssignments', () => {
    it('should update consumer assignments', async () => {
      await client.connect();

      const consumerAssignments: ConsumerGroupJoinEvent = {
        id: 'id',
        type: 'type',
        timestamp: 1234567890,
        payload: {
          duration: 20,
          groupId: 'group-id',
          isLeader: true,
          leaderId: 'member-1',
          groupProtocol: 'RoundRobin',
          memberId: 'member-1',
          memberAssignment: {
            'topic-a': [0, 1, 2],
            'topic-b': [3, 4, 5],
          },
        },
      };

      client['setConsumerAssignments'](consumerAssignments);

      expect(client['consumerAssignments']).toEqual(
        // consumerAssignments.payload.memberAssignment,
        {
          'topic-a': 0,
          'topic-b': 3,
        },
      );
    });

    it('should not update consumer assignments if there are no partitions assigned to consumer', async () => {
      await client.connect();

      const consumerAssignments: ConsumerGroupJoinEvent = {
        id: 'id',
        type: 'type',
        timestamp: 1234567890,
        payload: {
          duration: 20,
          groupId: 'group-id',
          isLeader: true,
          leaderId: 'member-1',
          groupProtocol: 'RoundRobin',
          memberId: 'member-1',
          memberAssignment: {
            'topic-a': [],
            'topic-b': [3, 4, 5],
          },
        },
      };

      client['setConsumerAssignments'](consumerAssignments);

      expect(client['consumerAssignments']).toEqual({
        'topic-b': 3,
      });
    });
  });

  describe('bindTopics', () => {
    it('should bind topics from response patterns', async () => {
      untypedClient.responsePatterns = [replyTopic];
      untypedClient._consumer = kafkaClient.consumer();

      await client.bindTopics();

      expect(subscribe).toHaveBeenCalledOnce();
      expect(subscribe).toHaveBeenCalledWith({
        topics: [replyTopic],
      });
      expect(run).toHaveBeenCalledOnce();
    });

    it('should bind topics from response patterns with options', async () => {
      untypedClient.responsePatterns = [replyTopic];
      untypedClient._consumer = kafkaClient.consumer();
      untypedClient.options.subscribe = {};
      untypedClient.options.subscribe.fromBeginning = true;

      await client.bindTopics();

      expect(subscribe).toHaveBeenCalledOnce();
      expect(subscribe).toHaveBeenCalledWith({
        topics: [replyTopic],
        fromBeginning: true,
      });
      expect(run).toHaveBeenCalledOnce();
    });
  });

  describe('createResponseCallback', () => {
    let subscription;

    describe('not completed', () => {
      beforeEach(async () => {
        subscription = client.createResponseCallback();

        client['routingMap'].set(correlationId, callback);
        subscription(payload);
      });
      it('should call callback with expected arguments', () => {
        expect(callback).toHaveBeenCalled();
        expect(callback).toHaveBeenCalledWith({
          err: undefined,
          response: messageValue,
        });
      });
    });

    describe('disposed and "id" is correct', () => {
      beforeEach(async () => {
        subscription = client.createResponseCallback();

        client['routingMap'].set(correlationId, callback);
        subscription(payloadDisposed);
      });

      it('should call callback with dispose param', () => {
        expect(callback).toHaveBeenCalled();
        expect(callback).toHaveBeenCalledWith({
          isDisposed: true,
          response: deserializedPayloadDisposed.message.value,
          err: undefined,
        });
      });
    });

    describe('error and "id" is correct', () => {
      beforeEach(async () => {
        subscription = client.createResponseCallback();

        client['routingMap'].set(correlationId, callback);
        subscription(payloadError);
      });

      it('should call callback with error param', () => {
        expect(callback).toHaveBeenCalled();
        expect(callback).toHaveBeenCalledWith({
          isDisposed: true,
          response: undefined,
          err: NO_MESSAGE_HANDLER,
        });
      });
    });

    describe('without "id"', () => {
      beforeEach(async () => {
        subscription = client.createResponseCallback();

        client['routingMap'].set(correlationId, callback);
        subscription(payloadWithoutCorrelation);
      });

      it('should not call callback', () => {
        expect(callback).not.toHaveBeenCalled();
      });
    });

    describe('disposed and "id" is incorrect', () => {
      beforeEach(async () => {
        callback = vi.fn();
        subscription = client.createResponseCallback();

        client['routingMap'].set('incorrect-correlation-id', callback);
        subscription(payload);
      });

      it('should not call callback', () => {
        expect(callback).not.toHaveBeenCalled();
      });
    });
  });

  describe('emitBatch', () => {
    it(`should return an observable stream`, () => {
      const stream$ = client.emitBatch(
        {},
        {
          messages: [],
        },
      );
      expect(stream$ instanceof Observable).toBe(true);
    });

    it(`should call "connect" immediately`, () => {
      const connectSpy = vi.spyOn(client, 'connect');
      client.emitBatch(
        {},
        {
          messages: [],
        },
      );
      expect(connectSpy).toHaveBeenCalledOnce();
    });

    describe('when "connect" throws', () => {
      it('should return Observable with error', () => {
        vi.spyOn(client, 'connect').mockImplementation(() => {
          throw new Error();
        });

        const stream$ = client.emitBatch(
          {},
          {
            messages: [],
          },
        );

        stream$.subscribe({
          next: () => {},
          error: err => {
            expect(err).toBeInstanceOf(Error);
          },
        });
      });
    });

    describe('when is connected', () => {
      beforeEach(() => {
        vi.spyOn(client, 'connect').mockImplementation(() =>
          Promise.resolve({} as Producer),
        );
      });

      it(`should call dispatchBatchEvent`, () => {
        const pattern = { test: 3 };
        const data = { messages: [] };
        const dispatchBatchEventSpy = vi
          .fn()
          .mockImplementation(() => Promise.resolve(true));
        const stream$ = client.emitBatch(pattern, data);
        client['dispatchBatchEvent'] = dispatchBatchEventSpy;
        stream$.subscribe(() => {
          expect(dispatchBatchEventSpy).toHaveBeenCalledOnce();
        });
      });
    });

    it('should return Observable with error', () => {
      const err$ = client.emitBatch(null, null!);
      expect(err$).toBeInstanceOf(Observable);
    });
  });

  describe('dispatchEvent', () => {
    const eventMessage = {
      id: undefined,
      pattern: topic,
      data: messageValue,
    };

    let sendStub: ReturnType<typeof vi.fn>;
    let sendSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      sendStub = vi.fn().mockImplementation(async a => {
        throw new Error('ERROR!');
      });
      sendSpy = vi.fn();
    });

    it('should publish packet', async () => {
      vi.spyOn(client as any, '_producer', 'get').mockReturnValue({
        send: sendSpy,
      });

      await client['dispatchEvent'](eventMessage);

      expect(sendSpy).toHaveBeenCalledOnce();
      expect(sendSpy.mock.calls[0][0].topic).toEqual(topic);
      expect(sendSpy.mock.calls[0][0].messages).not.toHaveLength(0);

      const sentMessage = sendSpy.mock.calls[0][0].messages[0];

      expect(sentMessage.value).toEqual(messageValue);
    });

    it('should throw error', async () => {
      vi.spyOn(client as any, 'producer', 'get').mockReturnValue({
        send: sendStub,
      });

      client['dispatchEvent'](eventMessage).catch(err =>
        expect(err).toBeInstanceOf(Error),
      );
    });
  });

  describe('getConsumerAssignments', () => {
    it('should get consumer assignments', () => {
      client['consumerAssignments'] = {
        [replyTopic]: 0,
      };

      const result = client.getConsumerAssignments();

      expect(result).toEqual(client['consumerAssignments']);
    });
  });

  describe('getReplyTopicPartition', () => {
    it('should get reply partition', () => {
      client['consumerAssignments'] = {
        [replyTopic]: 0,
      };

      const result = client['getReplyTopicPartition'](replyTopic);

      expect(result).toEqual('0');
    });

    it('should throw error when the topic is not being consumed', () => {
      client['consumerAssignments'] = {};

      expect(() => client['getReplyTopicPartition'](replyTopic)).toThrow(
        InvalidKafkaClientTopicException,
      );
    });

    it('should throw error when the topic is not being consumed', () => {
      client['consumerAssignments'] = {
        [topic]: undefined!,
      };

      expect(() => client['getReplyTopicPartition'](replyTopic)).toThrow(
        InvalidKafkaClientTopicException,
      );
    });
  });

  describe('publish', () => {
    const waitForNextTick = async () =>
      await new Promise(resolve => process.nextTick(resolve));
    const readPacket = {
      pattern: topic,
      data: messageValue,
    };

    let assignPacketIdStub: any;
    let normalizePatternSpy: any;
    let getResponsePatternNameSpy: any;
    let getReplyTopicPartitionSpy: any;
    let routingMapSetSpy: any;
    let sendSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      normalizePatternSpy = vi.spyOn(client as any, 'normalizePattern');
      getResponsePatternNameSpy = vi.spyOn(
        client as any,
        'getResponsePatternName',
      );
      getReplyTopicPartitionSpy = vi.spyOn(
        client as any,
        'getReplyTopicPartition',
      );
      routingMapSetSpy = vi.spyOn(untypedClient.routingMap, 'set');
      sendSpy = vi.fn().mockResolvedValue(undefined);

      assignPacketIdStub = vi
        .spyOn(client as any, 'assignPacketId')
        .mockImplementation(packet =>
          Object.assign(packet as object, {
            id: correlationId,
          }),
        );

      vi.spyOn(client as any, '_producer', 'get').mockReturnValue({
        send: sendSpy,
      });

      client['consumerAssignments'] = {
        [replyTopic]: parseFloat(replyPartition),
      };
    });

    it('should assign a packet id', async () => {
      client['publish'](readPacket, callback);

      await waitForNextTick();

      expect(assignPacketIdStub).toHaveBeenCalledWith(readPacket);
    });

    it('should normalize the pattern', async () => {
      client['publish'](readPacket, callback);

      await waitForNextTick();

      expect(normalizePatternSpy).toHaveBeenCalledWith(topic);
    });

    it('should get the reply pattern', async () => {
      client['publish'](readPacket, callback);

      await waitForNextTick();

      expect(getResponsePatternNameSpy).toHaveBeenCalledWith(topic);
    });

    it('should get the reply partition', async () => {
      client['publish'](readPacket, callback);

      await waitForNextTick();

      expect(getReplyTopicPartitionSpy).toHaveBeenCalledWith(replyTopic);
    });

    it('should add the callback to the routing map', async () => {
      client['publish'](readPacket, callback);

      await waitForNextTick();

      expect(routingMapSetSpy).toHaveBeenCalledOnce();
      expect(routingMapSetSpy.mock.calls[0][0]).toEqual(correlationId);
      expect(routingMapSetSpy.mock.calls[0][1]).toEqual(callback);
    });

    it('should send the message with headers', async () => {
      client['publish'](readPacket, callback);

      await waitForNextTick();

      expect(sendSpy).toHaveBeenCalledOnce();
      expect(sendSpy.mock.calls[0][0].topic).toEqual(topic);
      expect(sendSpy.mock.calls[0][0].messages).not.toHaveLength(0);

      const sentMessage = sendSpy.mock.calls[0][0].messages[0];

      expect(sentMessage.value).toEqual(messageValue);
      expect(sentMessage.headers).toBeDefined();
      expect(sentMessage.headers[KafkaHeaders.CORRELATION_ID]).toEqual(
        correlationId,
      );
      expect(sentMessage.headers[KafkaHeaders.REPLY_TOPIC]).toEqual(replyTopic);
      expect(sentMessage.headers[KafkaHeaders.REPLY_PARTITION]).toEqual(
        replyPartition,
      );
    });

    it('should remove callback from routing map when unsubscribe', async () => {
      client['publish'](readPacket, callback)();

      await waitForNextTick();

      expect(client['routingMap'].has(correlationId)).toBe(false);
      expect(client['routingMap'].size).toEqual(0);
    });

    describe('on error', () => {
      let clientProducerStub: any;
      let sendStub: ReturnType<typeof vi.fn>;

      beforeEach(() => {
        sendStub = vi.fn().mockImplementation(() => {
          throw new Error();
        });

        clientProducerStub = vi
          .spyOn(client as any, '_producer', 'get')
          .mockReturnValue({
            send: sendStub,
          });
      });

      afterEach(() => {
        clientProducerStub.mockRestore();
      });

      it('should call callback', async () => {
        /* eslint-disable-next-line no-async-promise-executor */
        return new Promise(async resolve => {
          return client['publish'](readPacket, ({ err }) => resolve(err));
        }).then(err => {
          expect(err).toBeInstanceOf(Error);
        });
      });
    });

    describe('dispose callback', () => {
      let subscription;
      let getResponsePatternNameStub: any;
      let getReplyTopicPartitionStub: any;

      beforeEach(async () => {
        // restore
        getResponsePatternNameSpy.mockRestore();
        getReplyTopicPartitionSpy.mockRestore();

        // return the topic instead of the reply topic
        getResponsePatternNameStub = vi
          .spyOn(client as any, 'getResponsePatternName')
          .mockImplementation(() => topic);
        getReplyTopicPartitionStub = vi
          .spyOn(client as any, 'getReplyTopicPartition')
          .mockImplementation(() => '0');

        subscription = client['publish'](readPacket, callback);
        subscription(payloadDisposed);
      });

      afterEach(() => {
        getResponsePatternNameStub.mockRestore();
        getReplyTopicPartitionStub.mockRestore();
      });

      it('should remove callback from routing map', async () => {
        expect(client['routingMap'].has(correlationId)).toBe(false);
        expect(client['routingMap'].size).toEqual(0);
      });
    });
  });
});
