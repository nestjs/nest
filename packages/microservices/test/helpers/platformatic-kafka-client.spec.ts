import { EventEmitter } from 'events';
import { Readable } from 'stream';
import { KafkaReplyPartitionAssigner } from '../../helpers/kafka-reply-partition-assigner.js';
import {
  PlatformaticConsumer,
  PlatformaticKafkaClient,
  PlatformaticProducer,
  unwrapKafkaInstance,
} from '../../helpers/platformatic-kafka-client.js';

class FakeStream extends Readable {
  constructor() {
    super({ objectMode: true, read() {} });
  }

  close = vi.fn(() => {
    this.push(null);
    return new Promise<void>(resolve => this.once('close', resolve));
  });
}

class FakeConsumer extends EventEmitter {
  readonly groupId: string;
  readonly streams: FakeStream[] = [];
  consume = vi.fn(async () => {
    const stream = new FakeStream();
    this.streams.push(stream);
    return stream;
  });
  metadata = vi.fn(async () => ({}));
  commit = vi.fn(async () => undefined);
  close = vi.fn(async () => undefined);

  constructor(readonly options: Record<string, any>) {
    super();
    this.groupId = options.groupId;
  }
}

class FakeProducer extends EventEmitter {
  metadata = vi.fn(async () => ({}));
  send = vi.fn(async () => ({ offsets: [] }));
  close = vi.fn(async () => undefined);

  constructor(readonly options: Record<string, any>) {
    super();
  }
}

const listTopics = vi.fn();
const closeAdmin = vi.fn(async () => undefined);
class FakeAdmin {
  listTopics = listTopics;
  close = closeAdmin;
}

const kafkaPackage = {
  Consumer: FakeConsumer,
  Producer: FakeProducer,
  Admin: FakeAdmin,
};

const baseOptions = { bootstrapBrokers: ['broker:9092'], clientId: 'app' };

function createMessage(
  offset: number,
  value: string,
  headerEntries: [string, string][] = [],
) {
  return {
    topic: 'topic',
    partition: 0,
    key: undefined,
    value: Buffer.from(value),
    headerEntries: headerEntries.map(([name, headerValue]) => [
      Buffer.from(name),
      Buffer.from(headerValue),
    ]),
    offset: BigInt(offset),
    timestamp: 1000n,
    leaderEpoch: 3,
    commit: vi.fn(async () => undefined),
  };
}

describe('PlatformaticKafkaClient', () => {
  let logger: { log: any; warn: any; error: any };
  let client: PlatformaticKafkaClient;

  beforeEach(() => {
    logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
    client = new PlatformaticKafkaClient(
      kafkaPackage,
      baseOptions,
      logger as any,
    );
    listTopics.mockReset();
    closeAdmin.mockClear();
  });

  describe('consumer', () => {
    let consumer: PlatformaticConsumer;
    let native: FakeConsumer;

    beforeEach(() => {
      consumer = client.consumer({ groupId: 'group', sessionTimeout: 10000 });
      native = consumer.native as unknown as FakeConsumer;
    });

    afterEach(() => consumer.disconnect());

    it('should create the consumer with the client options', () => {
      expect(native.options).toEqual({
        ...baseOptions,
        // The protocol of kafkajs consumers, to share their groups
        protocols: [{ name: 'RoundRobinAssigner', version: 0 }],
        groupId: 'group',
        sessionTimeout: 10000,
      });
    });

    it('should not set group protocols for the consumer group protocol', () => {
      const kip848Consumer = client.consumer({
        groupId: 'group',
        groupProtocol: 'consumer',
      });

      expect(
        (kip848Consumer.native as unknown as FakeConsumer).options.protocols,
      ).toBeUndefined();
    });

    it('should report a failure of the consumer to rejoin its group as a crash', () => {
      const onCrash = vi.fn();
      consumer.on(consumer.events.CRASH, onCrash);
      const error = new Error('rejoin failed');

      native.emit('error', error);

      expect(onCrash).toHaveBeenCalledWith(
        expect.objectContaining({ payload: { error, groupId: 'group' } }),
      );
      expect(logger.error).toHaveBeenCalledWith(
        'The consumer crashed: Error: rejoin failed',
      );
    });

    it('should connect to the cluster', async () => {
      const onConnect = vi.fn();
      consumer.on(consumer.events.CONNECT, onConnect);

      await consumer.connect();

      expect(native.metadata).toHaveBeenCalledWith({ topics: [] });
      expect(onConnect).toHaveBeenCalled();
    });

    it('should consume from the committed offsets, committing itself', async () => {
      await consumer.subscribe({ topics: ['topic'] });
      await consumer.run({ eachMessage: async () => undefined });

      expect(native.consume).toHaveBeenCalledWith({
        mode: 'committed',
        fallbackMode: 'latest',
        topics: ['topic'],
        autocommit: false,
      });
    });

    it('should start from the earliest offset with "fromBeginning"', async () => {
      await consumer.subscribe({ topics: ['topic'], fromBeginning: true });
      await consumer.run({ eachMessage: async () => undefined });

      expect(native.consume).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'committed',
          fallbackMode: 'earliest',
        }),
      );
    });

    it('should take the "fallbackMode" of the options', async () => {
      await consumer.subscribe({ topics: ['topic'], fallbackMode: 'fail' });
      await consumer.run({ eachMessage: async () => undefined });

      expect(native.consume).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'committed', fallbackMode: 'fail' }),
      );
    });

    it('should consume the existing topics that a regex matches', async () => {
      listTopics.mockResolvedValue(['orders.created', 'orders.paid', 'users']);

      await consumer.subscribe({ topics: ['other', /^orders\./] });
      await consumer.run({ eachMessage: async () => undefined });

      expect(native.consume).toHaveBeenCalledWith(
        expect.objectContaining({
          topics: ['other', 'orders.created', 'orders.paid'],
        }),
      );
      expect(closeAdmin).toHaveBeenCalled();
    });

    it('should hand the messages to eachMessage, then commit their offsets', async () => {
      const payloads: any[] = [];
      const handled = new Promise<void>(resolve =>
        consumer.run({
          eachMessage: async payload => {
            payloads.push(payload);
            if (payloads.length === 2) {
              resolve();
            }
          },
        }),
      );
      await vi.waitFor(() => expect(native.streams).toHaveLength(1));
      const first = createMessage(4, 'a', [
        ['tag', 'x'],
        ['tag', 'y'],
        ['id', '1'],
      ]);
      const second = createMessage(5, 'b');

      native.streams[0].push(first);
      native.streams[0].push(second);
      await handled;

      expect(payloads[0]).toEqual({
        topic: 'topic',
        partition: 0,
        message: {
          key: null,
          value: Buffer.from('a'),
          headers: {
            tag: [Buffer.from('x'), Buffer.from('y')],
            id: Buffer.from('1'),
          },
          offset: 4n,
          timestamp: 1000n,
          leaderEpoch: 3,
        },
        heartbeat: expect.any(Function),
      });
      await vi.waitFor(() => expect(second.commit).toHaveBeenCalled());
      expect(first.commit).toHaveBeenCalled();
    });

    it('should keep the messages fetched while one is handled when the stream resumes', async () => {
      const values: string[] = [];
      let finishFirst!: () => void;
      const handled = new Promise<void>(resolve =>
        consumer.run({
          eachMessage: async ({ message }) => {
            values.push(message.value!.toString());
            if (values.length === 1) {
              await new Promise<void>(done => (finishFirst = done));
            }
            if (values.length === 2) {
              resolve();
            }
          },
        }),
      );
      await vi.waitFor(() => expect(native.streams).toHaveLength(1));
      const stream = native.streams[0];
      stream.push(createMessage(0, 'a'));
      await vi.waitFor(() => expect(values).toEqual(['a']));

      // As @platformatic/kafka does around a cooperative rebalance
      stream.pause();
      stream.push(createMessage(1, 'b'));
      stream.resume();
      await new Promise(resolve => setImmediate(resolve));
      finishFirst();
      await handled;

      expect(values).toEqual(['a', 'b']);
    });

    it('should not wait for a commit that the closed stream settles no more', async () => {
      const message = createMessage(0, 'a');
      message.commit.mockReturnValue(new Promise(() => undefined));
      const handled = new Promise<void>(resolve =>
        consumer.run({
          eachMessage: async () => {
            resolve();
          },
        }),
      );
      await vi.waitFor(() => expect(native.streams).toHaveLength(1));
      native.streams[0].push(message);
      await handled;

      native.streams[0].destroy();

      await vi.waitFor(() => expect(native.streams).toHaveLength(2), {
        timeout: 2000,
      });
    });

    it('should not commit the offsets with "autoCommit" off', async () => {
      const message = createMessage(0, 'a');
      const handled = new Promise<void>(resolve =>
        consumer.run({ eachMessage: async () => resolve(), autoCommit: false }),
      );
      await vi.waitFor(() => expect(native.streams).toHaveLength(1));

      native.streams[0].push(message);
      await handled;
      await consumer.disconnect();

      expect(message.commit).not.toHaveBeenCalled();
    });

    it('should consume from the committed offsets again once a message fails', async () => {
      const failed = createMessage(0, 'a');
      const eachMessage = vi
        .fn()
        .mockRejectedValueOnce(new Error('handler failed'))
        .mockResolvedValue(undefined);
      await consumer.run({ eachMessage });

      native.streams[0].push(failed);

      await vi.waitFor(() => expect(native.streams).toHaveLength(2), {
        timeout: 2000,
      });
      expect(failed.commit).not.toHaveBeenCalled();
      expect(native.streams[0].close).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to handle a message, which will be delivered again: Error: handler failed',
      );
      const redelivered = createMessage(0, 'a');
      native.streams[1].push(redelivered);
      await vi.waitFor(() => expect(redelivered.commit).toHaveBeenCalled());
    });

    it('should report a crash and consume again once the stream fails', async () => {
      const onCrash = vi.fn();
      consumer.on(consumer.events.CRASH, onCrash);
      await consumer.run({ eachMessage: async () => undefined });

      native.streams[0].destroy(new Error('group lost'));

      await vi.waitFor(() => expect(native.streams).toHaveLength(2), {
        timeout: 2000,
      });
      expect(onCrash).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: { error: new Error('group lost'), groupId: 'group' },
        }),
      );
    });

    it('should wait for the message being handled when it disconnects', async () => {
      const onStop = vi.fn();
      const onDisconnect = vi.fn();
      consumer.on(consumer.events.STOP, onStop);
      consumer.on(consumer.events.DISCONNECT, onDisconnect);
      let finishHandler!: () => void;
      const message = createMessage(0, 'a');
      const started = new Promise<void>(resolve =>
        consumer.run({
          eachMessage: () => {
            resolve();
            return new Promise<void>(done => (finishHandler = done));
          },
        }),
      );
      await vi.waitFor(() => expect(native.streams).toHaveLength(1));
      native.streams[0].push(message);
      await started;

      const disconnecting = consumer.disconnect();
      await new Promise(resolve => setImmediate(resolve));
      expect(native.close).not.toHaveBeenCalled();
      finishHandler();
      await disconnecting;

      expect(message.commit).toHaveBeenCalled();
      expect(native.streams[0].close).toHaveBeenCalled();
      expect(native.close).toHaveBeenCalled();
      expect(onStop).toHaveBeenCalled();
      expect(onDisconnect).toHaveBeenCalled();
    });

    it('should emit the assignment of the member when it joins its group', () => {
      const onJoin = vi.fn();
      consumer.on(consumer.events.GROUP_JOIN, onJoin);

      native.emit('consumer:group:join', {
        groupId: 'group',
        memberId: 'member',
        isLeader: true,
        assignments: [{ topic: 'replies', partitions: [2, 3] }],
      });

      expect(onJoin).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: {
            groupId: 'group',
            memberId: 'member',
            isLeader: true,
            memberAssignment: { replies: [2, 3] },
          },
        }),
      );
    });

    it('should emit a rebalance of its group', () => {
      const onRebalance = vi.fn();
      consumer.on(consumer.events.REBALANCING, onRebalance);

      native.emit('consumer:group:rebalance', { groupId: 'group' });

      expect(onRebalance).toHaveBeenCalled();
    });

    it('should commit offsets through the consumer', async () => {
      const offsets = [
        { topic: 'topic', partition: 0, offset: 5n, leaderEpoch: 1 },
      ];

      await consumer.commitOffsets(offsets);

      expect(native.commit).toHaveBeenCalledWith({ offsets });
    });
  });

  describe('consumer with the reply partition assigner', () => {
    let options: Record<string, any>;

    beforeEach(() => {
      const clientKafka = {
        getConsumerAssignments: () => ({ replies: 1 }),
      } as any;
      const consumer = client.consumer({
        groupId: 'group',
        partitionAssigners: [
          config => new KafkaReplyPartitionAssigner(clientKafka, config),
        ],
      });
      options = (consumer.native as unknown as FakeConsumer).options;
    });

    it('should join with the protocol of the assigner', () => {
      expect(options.protocols).toEqual([
        { name: 'NestReplyPartitionAssigner', version: 1 },
      ]);
      expect(
        JSON.parse(options.protocolsMetadata([], [], {}).toString()),
      ).toEqual({ previousAssignment: { replies: 1 } });
    });

    it('should keep the partition a member had before', () => {
      const userData = (assignment: Record<string, number>) =>
        Buffer.from(JSON.stringify({ previousAssignment: assignment }));
      const members = new Map([
        ['member-a', { memberId: 'member-a', metadata: userData({}) }],
        [
          'member-b',
          { memberId: 'member-b', metadata: userData({ replies: 0 }) },
        ],
      ]);
      const metadata = {
        topics: new Map([['replies', { partitionsCount: 3 }]]),
      };

      const assignments = options.partitionAssigner(
        'member-a',
        members,
        new Set(['replies']),
        metadata,
      );

      expect(assignments).toEqual([
        {
          memberId: 'member-a',
          assignments: new Map([
            ['replies', { topic: 'replies', partitions: [1, 2] }],
          ]),
        },
        {
          memberId: 'member-b',
          assignments: new Map([
            ['replies', { topic: 'replies', partitions: [0] }],
          ]),
        },
      ]);
    });
  });

  describe('producer', () => {
    let producer: PlatformaticProducer;
    let native: FakeProducer;

    beforeEach(() => {
      producer = client.producer({ idempotent: true });
      native = producer.native as unknown as FakeProducer;
    });

    it('should create the producer with the client options', () => {
      expect(native.options).toEqual({ ...baseOptions, idempotent: true });
    });

    it('should connect to the cluster and disconnect', async () => {
      const onConnect = vi.fn();
      const onDisconnect = vi.fn();
      producer.on(producer.events.CONNECT, onConnect);
      producer.on(producer.events.DISCONNECT, onDisconnect);

      await producer.connect();
      await producer.disconnect();

      expect(native.metadata).toHaveBeenCalledWith({ topics: [] });
      expect(native.close).toHaveBeenCalled();
      expect(onConnect).toHaveBeenCalled();
      expect(onDisconnect).toHaveBeenCalled();
    });

    it('should send kafkajs messages as messages of @platformatic/kafka', async () => {
      await producer.send({
        topic: 'topic',
        acks: -1,
        messages: [
          {
            key: 'key',
            value: '{"id":1}',
            headers: { id: Buffer.from('1'), tag: ['x', 'y'] },
            partition: 2,
            timestamp: '1000',
          },
          { value: null },
        ],
      });

      const [{ messages, acks }] = native.send.mock.calls[0] as any;
      expect(acks).toBe(-1);
      expect(messages[0]).toEqual({
        topic: 'topic',
        key: Buffer.from('key'),
        value: Buffer.from('{"id":1}'),
        headers: expect.any(Map),
        partition: 2,
        timestamp: 1000n,
      });
      expect(
        [...messages[0].headers].map(([name, value]) => [
          name.toString(),
          value.toString(),
        ]),
      ).toEqual([
        ['id', '1'],
        ['tag', 'x'],
        ['tag', 'y'],
      ]);
      expect(messages[1]).toEqual({
        topic: 'topic',
        key: undefined,
        value: null,
        headers: new Map(),
      });
    });
  });

  describe('unwrapKafkaInstance', () => {
    it('should give the consumer and producer of @platformatic/kafka', () => {
      const consumer = client.consumer({ groupId: 'group' });
      const producer = client.producer();

      expect(unwrapKafkaInstance(consumer)).toBe(consumer.native);
      expect(unwrapKafkaInstance(producer)).toBe(producer.native);
    });

    it('should give a kafkajs consumer as it is', () => {
      const kafkajsConsumer = { run: vi.fn() };

      expect(unwrapKafkaInstance(kafkajsConsumer)).toBe(kafkajsConsumer);
    });
  });
});
