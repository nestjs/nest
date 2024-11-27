import { expect } from 'chai';
import { Producer } from 'kafkajs';
import { Observable } from 'rxjs';
import * as sinon from 'sinon';
import { ClientKafka } from '../../client/client-kafka';
import { NO_MESSAGE_HANDLER } from '../../constants';
import { KafkaHeaders } from '../../enums';
import { InvalidKafkaClientTopicException } from '../../errors/invalid-kafka-client-topic.exception';
import {
  ConsumerGroupJoinEvent,
  EachMessagePayload,
  KafkaMessage,
} from '../../external/kafka.interface';

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
  let callback: sinon.SinonSpy;
  let connect: sinon.SinonSpy;
  let subscribe: sinon.SinonSpy;
  let run: sinon.SinonSpy;
  let send: sinon.SinonSpy;
  let on: sinon.SinonSpy;
  let consumerStub: sinon.SinonStub;
  let producerStub: sinon.SinonStub;
  let createClientStub: sinon.SinonStub;
  let kafkaClient: any;

  beforeEach(() => {
    client = new ClientKafka({});
    untypedClient = client as any;

    callback = sinon.spy();
    connect = sinon.spy();
    subscribe = sinon.spy();
    run = sinon.spy();
    send = sinon.spy();
    on = sinon.spy();

    consumerStub = sinon.stub(client as any, 'consumer').callsFake(() => {
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
    producerStub = sinon.stub(client as any, 'producer').callsFake(() => {
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

    createClientStub = sinon
      .stub(client, 'createClient')
      .callsFake(() => kafkaClient);
  });

  describe('createClient', () => {
    beforeEach(() => {
      client = new ClientKafka({});
    });

    it(`should accept a custom logCreator in client options`, () => {
      const logCreatorSpy = sinon.spy(() => 'test');
      const logCreator = () => logCreatorSpy;

      client = new ClientKafka({
        client: {
          brokers: [],
          logCreator,
        },
      });

      const logger = client.createClient().logger();

      logger.info({ namespace: '', level: 1, log: 'test' });

      expect(logCreatorSpy.called).to.be.true;
    });
  });

  describe('subscribeToResponseOf', () => {
    let normalizePatternSpy: sinon.SinonSpy;
    let getResponsePatternNameSpy: sinon.SinonSpy;

    beforeEach(() => {
      normalizePatternSpy = sinon.spy(client as any, 'normalizePattern');
      getResponsePatternNameSpy = sinon.spy(
        client as any,
        'getResponsePatternName',
      );
    });

    it(`should create an array of response patterns`, () => {
      client.subscribeToResponseOf(topic);

      expect(normalizePatternSpy.calledWith(topic)).to.be.true;
      expect(getResponsePatternNameSpy.calledWith(topic)).to.be.true;
      expect(client['responsePatterns']).to.not.be.empty;
      expect(client['responsePatterns'][0]).to.eq(replyTopic);
    });

    afterEach(() => {
      normalizePatternSpy.restore();
    });
  });

  describe('close', () => {
    const consumer = { disconnect: sinon.stub().resolves() };
    const producer = { disconnect: sinon.stub().resolves() };
    beforeEach(() => {
      untypedClient._consumer = consumer;
      untypedClient._producer = producer;
    });
    it('should close server', async () => {
      await client.close();

      expect(consumer.disconnect.calledOnce).to.be.true;
      expect(producer.disconnect.calledOnce).to.be.true;
      expect(untypedClient._consumer).to.be.null;
      expect(untypedClient._producer).to.be.null;
      expect(untypedClient.client).to.be.null;
    });
  });

  describe('connect', () => {
    let consumerAssignmentsStub: sinon.SinonStub;
    let bindTopicsStub: sinon.SinonStub;

    describe('consumer and producer', () => {
      beforeEach(() => {
        consumerAssignmentsStub = sinon.stub(
          client as any,
          'consumerAssignments',
        );
        bindTopicsStub = sinon
          .stub(client, 'bindTopics')
          .callsFake(async () => {});
      });

      it('should expect the connection to be created', async () => {
        const connection = await client.connect();

        expect(createClientStub.calledOnce).to.be.true;
        expect(producerStub.calledOnce).to.be.true;
        expect(consumerStub.calledOnce).to.be.true;
        expect(on.called).to.be.true;
        expect(client['consumerAssignments']).to.be.empty;
        expect(connect.calledTwice).to.be.true;
        expect(bindTopicsStub.calledOnce).to.be.true;
        expect(connection).to.deep.equal(producerStub());
      });

      it('should expect the connection to be reused', async () => {
        untypedClient.initialized = Promise.resolve({});

        await client.connect();

        expect(createClientStub.calledOnce).to.be.false;
        expect(producerStub.calledOnce).to.be.false;
        expect(consumerStub.calledOnce).to.be.false;

        expect(on.calledOnce).to.be.false;
        expect(client['consumerAssignments']).to.be.empty;

        expect(connect.calledTwice).to.be.false;

        expect(bindTopicsStub.calledOnce).to.be.false;
      });
    });

    describe('producer only mode', () => {
      beforeEach(() => {
        consumerAssignmentsStub = sinon.stub(
          client as any,
          'consumerAssignments',
        );
        bindTopicsStub = sinon
          .stub(client, 'bindTopics')
          .callsFake(async () => {});
        client['producerOnlyMode'] = true;
      });

      it('should expect the connection to be created', async () => {
        const connection = await client.connect();

        expect(createClientStub.calledOnce).to.be.true;
        expect(producerStub.calledOnce).to.be.true;

        expect(consumerStub.calledOnce).to.be.false;

        expect(on.calledOnce).to.be.false;
        expect(client['consumerAssignments']).to.be.empty;

        expect(connect.calledOnce).to.be.true;

        expect(bindTopicsStub.calledOnce).to.be.false;
        expect(connection).to.deep.equal(producerStub());
      });

      it('should expect the connection to be reused', async () => {
        untypedClient.initialized = Promise.resolve({});

        await client.connect();

        expect(createClientStub.calledOnce).to.be.false;
        expect(producerStub.calledOnce).to.be.false;
        expect(consumerStub.calledOnce).to.be.false;

        expect(on.calledOnce).to.be.false;
        expect(client['consumerAssignments']).to.be.empty;

        expect(connect.calledTwice).to.be.false;

        expect(bindTopicsStub.calledOnce).to.be.false;
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

      expect(client['consumerAssignments']).to.deep.eq(
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

      expect(client['consumerAssignments']).to.deep.eq({
        'topic-b': 3,
      });
    });
  });

  describe('bindTopics', () => {
    it('should bind topics from response patterns', async () => {
      untypedClient.responsePatterns = [replyTopic];
      untypedClient._consumer = kafkaClient.consumer();

      await client.bindTopics();

      expect(subscribe.calledOnce).to.be.true;
      expect(
        subscribe.calledWith({
          topics: [replyTopic],
        }),
      ).to.be.true;
      expect(run.calledOnce).to.be.true;
    });

    it('should bind topics from response patterns with options', async () => {
      untypedClient.responsePatterns = [replyTopic];
      untypedClient._consumer = kafkaClient.consumer();
      untypedClient.options.subscribe = {};
      untypedClient.options.subscribe.fromBeginning = true;

      await client.bindTopics();

      expect(subscribe.calledOnce).to.be.true;
      expect(
        subscribe.calledWith({
          topics: [replyTopic],
          fromBeginning: true,
        }),
      ).to.be.true;
      expect(run.calledOnce).to.be.true;
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
        expect(callback.called).to.be.true;
        expect(
          callback.calledWith({
            err: undefined,
            response: messageValue,
          }),
        ).to.be.true;
      });
    });

    describe('disposed and "id" is correct', () => {
      beforeEach(async () => {
        subscription = client.createResponseCallback();

        client['routingMap'].set(correlationId, callback);
        subscription(payloadDisposed);
      });

      it('should call callback with dispose param', () => {
        expect(callback.called).to.be.true;
        expect(
          callback.calledWith({
            isDisposed: true,
            response: deserializedPayloadDisposed.message.value,
            err: undefined,
          }),
        ).to.be.true;
      });
    });

    describe('error and "id" is correct', () => {
      beforeEach(async () => {
        subscription = client.createResponseCallback();

        client['routingMap'].set(correlationId, callback);
        subscription(payloadError);
      });

      it('should call callback with error param', () => {
        expect(callback.called).to.be.true;
        expect(
          callback.calledWith({
            isDisposed: true,
            response: undefined,
            err: NO_MESSAGE_HANDLER,
          }),
        ).to.be.true;
      });
    });

    describe('without "id"', () => {
      beforeEach(async () => {
        subscription = client.createResponseCallback();

        client['routingMap'].set(correlationId, callback);
        subscription(payloadWithoutCorrelation);
      });

      it('should not call callback', () => {
        expect(callback.called).to.be.false;
      });
    });

    describe('disposed and "id" is incorrect', () => {
      beforeEach(async () => {
        callback = sinon.spy();
        subscription = client.createResponseCallback();

        client['routingMap'].set('incorrect-correlation-id', callback);
        subscription(payload);
      });

      it('should not call callback', () => {
        expect(callback.called).to.be.false;
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
      expect(stream$ instanceof Observable).to.be.true;
    });

    it(`should call "connect" immediately`, () => {
      const connectSpy = sinon.spy(client, 'connect');
      client.emitBatch(
        {},
        {
          messages: [],
        },
      );
      expect(connectSpy.calledOnce).to.be.true;
    });

    describe('when "connect" throws', () => {
      it('should return Observable with error', () => {
        sinon.stub(client, 'connect').callsFake(() => {
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
            expect(err).to.be.instanceof(Error);
          },
        });
      });
    });

    describe('when is connected', () => {
      beforeEach(() => {
        sinon
          .stub(client, 'connect')
          .callsFake(() => Promise.resolve({} as Producer));
      });

      it(`should call dispatchBatchEvent`, () => {
        const pattern = { test: 3 };
        const data = { messages: [] };
        const dispatchBatchEventSpy = sinon
          .stub()
          .callsFake(() => Promise.resolve(true));
        const stream$ = client.emitBatch(pattern, data);
        client['dispatchBatchEvent'] = dispatchBatchEventSpy;
        stream$.subscribe(() => {
          expect(dispatchBatchEventSpy.calledOnce).to.be.true;
        });
      });
    });

    it('should return Observable with error', () => {
      const err$ = client.emitBatch(null, null!);
      expect(err$).to.be.instanceOf(Observable);
    });
  });

  describe('dispatchEvent', () => {
    const eventMessage = {
      id: undefined,
      pattern: topic,
      data: messageValue,
    };

    let sendStub: sinon.SinonStub;
    let sendSpy: sinon.SinonSpy;

    beforeEach(() => {
      sendStub = sinon.stub().callsFake(async a => {
        throw new Error('ERROR!');
      });
      sendSpy = sinon.spy();
    });

    it('should publish packet', async () => {
      sinon.stub(client as any, '_producer').value({
        send: sendSpy,
      });

      await client['dispatchEvent'](eventMessage);

      expect(sendSpy.calledOnce).to.be.true;
      expect(sendSpy.args[0][0].topic).to.eq(topic);
      expect(sendSpy.args[0][0].messages).to.not.be.empty;

      const sentMessage = sendSpy.args[0][0].messages[0];

      expect(sentMessage.value).to.eq(messageValue);
    });

    it('should throw error', async () => {
      sinon.stub(client as any, 'producer').value({
        send: sendStub,
      });

      client['dispatchEvent'](eventMessage).catch(err =>
        expect(err).to.be.instanceOf(Error),
      );
    });
  });

  describe('getConsumerAssignments', () => {
    it('should get consumer assignments', () => {
      client['consumerAssignments'] = {
        [replyTopic]: 0,
      };

      const result = client.getConsumerAssignments();

      expect(result).to.deep.eq(client['consumerAssignments']);
    });
  });

  describe('getReplyTopicPartition', () => {
    it('should get reply partition', () => {
      client['consumerAssignments'] = {
        [replyTopic]: 0,
      };

      const result = client['getReplyTopicPartition'](replyTopic);

      expect(result).to.eq('0');
    });

    it('should throw error when the topic is not being consumed', () => {
      client['consumerAssignments'] = {};

      expect(() => client['getReplyTopicPartition'](replyTopic)).to.throw(
        InvalidKafkaClientTopicException,
      );
    });

    it('should throw error when the topic is not being consumed', () => {
      client['consumerAssignments'] = {
        [topic]: undefined!,
      };

      expect(() => client['getReplyTopicPartition'](replyTopic)).to.throw(
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

    let assignPacketIdStub: sinon.SinonStub;
    let normalizePatternSpy: sinon.SinonSpy;
    let getResponsePatternNameSpy: sinon.SinonSpy;
    let getReplyTopicPartitionSpy: sinon.SinonSpy;
    let routingMapSetSpy: sinon.SinonSpy;
    let sendSpy: sinon.SinonSpy;

    beforeEach(() => {
      normalizePatternSpy = sinon.spy(client as any, 'normalizePattern');
      getResponsePatternNameSpy = sinon.spy(
        client as any,
        'getResponsePatternName',
      );
      getReplyTopicPartitionSpy = sinon.spy(
        client as any,
        'getReplyTopicPartition',
      );
      routingMapSetSpy = sinon.spy(untypedClient.routingMap, 'set');
      sendSpy = sinon.spy(() => Promise.resolve());

      assignPacketIdStub = sinon
        .stub(client as any, 'assignPacketId')
        .callsFake(packet =>
          Object.assign(packet as object, {
            id: correlationId,
          }),
        );

      sinon.stub(client as any, '_producer').value({
        send: sendSpy,
      });

      client['consumerAssignments'] = {
        [replyTopic]: parseFloat(replyPartition),
      };
    });

    it('should assign a packet id', async () => {
      client['publish'](readPacket, callback);

      await waitForNextTick();

      expect(assignPacketIdStub.calledWith(readPacket)).to.be.true;
    });

    it('should normalize the pattern', async () => {
      client['publish'](readPacket, callback);

      await waitForNextTick();

      expect(normalizePatternSpy.calledWith(topic)).to.be.true;
    });

    it('should get the reply pattern', async () => {
      client['publish'](readPacket, callback);

      await waitForNextTick();

      expect(getResponsePatternNameSpy.calledWith(topic)).to.be.true;
    });

    it('should get the reply partition', async () => {
      client['publish'](readPacket, callback);

      await waitForNextTick();

      expect(getReplyTopicPartitionSpy.calledWith(replyTopic)).to.be.true;
    });

    it('should add the callback to the routing map', async () => {
      client['publish'](readPacket, callback);

      await waitForNextTick();

      expect(routingMapSetSpy.calledOnce).to.be.true;
      expect(routingMapSetSpy.args[0][0]).to.eq(correlationId);
      expect(routingMapSetSpy.args[0][1]).to.eq(callback);
    });

    it('should send the message with headers', async () => {
      client['publish'](readPacket, callback);

      await waitForNextTick();

      expect(sendSpy.calledOnce).to.be.true;
      expect(sendSpy.args[0][0].topic).to.eq(topic);
      expect(sendSpy.args[0][0].messages).to.not.be.empty;

      const sentMessage = sendSpy.args[0][0].messages[0];

      expect(sentMessage.value).to.eq(messageValue);
      expect(sentMessage.headers).to.not.be.empty;
      expect(sentMessage.headers[KafkaHeaders.CORRELATION_ID]).to.eq(
        correlationId,
      );
      expect(sentMessage.headers[KafkaHeaders.REPLY_TOPIC]).to.eq(replyTopic);
      expect(sentMessage.headers[KafkaHeaders.REPLY_PARTITION]).to.eq(
        replyPartition,
      );
    });

    it('should remove callback from routing map when unsubscribe', async () => {
      client['publish'](readPacket, callback)();

      await waitForNextTick();

      expect(client['routingMap'].has(correlationId)).to.be.false;
      expect(client['routingMap'].size).to.eq(0);
    });

    describe('on error', () => {
      let clientProducerStub: sinon.SinonStub;
      let sendStub: sinon.SinonStub;

      beforeEach(() => {
        sendStub = sinon.stub().callsFake(() => {
          throw new Error();
        });

        clientProducerStub = sinon.stub(client as any, '_producer').value({
          send: sendStub,
        });
      });

      afterEach(() => {
        clientProducerStub.restore();
      });

      it('should call callback', async () => {
        /* eslint-disable-next-line no-async-promise-executor */
        return new Promise(async resolve => {
          return client['publish'](readPacket, ({ err }) => resolve(err));
        }).then(err => {
          expect(err).to.be.instanceof(Error);
        });
      });
    });

    describe('dispose callback', () => {
      let subscription;
      let getResponsePatternNameStub: sinon.SinonStub;
      let getReplyTopicPartitionStub: sinon.SinonStub;

      beforeEach(async () => {
        // restore
        getResponsePatternNameSpy.restore();
        getReplyTopicPartitionSpy.restore();

        // return the topic instead of the reply topic
        getResponsePatternNameStub = sinon
          .stub(client as any, 'getResponsePatternName')
          .callsFake(() => topic);
        getReplyTopicPartitionStub = sinon
          .stub(client as any, 'getReplyTopicPartition')
          .callsFake(() => '0');

        subscription = client['publish'](readPacket, callback);
        subscription(payloadDisposed);
      });

      afterEach(() => {
        getResponsePatternNameStub.restore();
        getReplyTopicPartitionStub.restore();
      });

      it('should remove callback from routing map', async () => {
        expect(client['routingMap'].has(correlationId)).to.be.false;
        expect(client['routingMap'].size).to.eq(0);
      });
    });
  });
});
