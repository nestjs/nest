import { adaptKafkajsClient } from '../../utils/kafkajs-adapter.utils.js';

describe('adaptKafkajsClient', () => {
  let consumer: Record<string, ReturnType<typeof vi.fn> | object>;
  let producer: Record<string, ReturnType<typeof vi.fn> | object>;
  let kafka: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    consumer = {
      run: vi.fn(),
      commitOffsets: vi.fn(),
      seek: vi.fn(),
      connect: vi.fn(),
      events: { CRASH: 'consumer.crash' },
    };
    producer = {
      send: vi.fn(),
      sendBatch: vi.fn(),
      connect: vi.fn(),
    };
    kafka = {
      consumer: vi.fn(() => consumer),
      producer: vi.fn(() => producer),
      admin: vi.fn(() => 'admin'),
      logger: vi.fn(() => 'logger'),
    };
  });

  describe('consumer', () => {
    it('should pass a message with bigint offset and timestamp to "eachMessage"', async () => {
      const eachMessage = vi.fn();
      await adaptKafkajsClient(kafka)
        .consumer({ groupId: 'group' })
        .run({ autoCommit: false, eachMessage });
      const [runConfig] = (consumer.run as ReturnType<typeof vi.fn>).mock
        .calls[0];

      await runConfig.eachMessage({
        topic: 'topic',
        partition: 0,
        message: {
          key: null,
          value: Buffer.from('value'),
          offset: '9007199254740993',
          timestamp: '1700000000000',
          attributes: 0,
          batchContext: {
            firstOffset: '9007199254740993',
            firstTimestamp: '1700000000000',
            maxTimestamp: '1700000000000',
            producerId: '-1',
            producerEpoch: 0,
            inTransaction: false,
          },
        },
      });

      expect(kafka.consumer).toHaveBeenCalledExactlyOnceWith({
        groupId: 'group',
      });
      expect(runConfig.autoCommit).toBe(false);
      expect(eachMessage).toHaveBeenCalledExactlyOnceWith({
        topic: 'topic',
        partition: 0,
        message: {
          key: null,
          value: Buffer.from('value'),
          offset: 9007199254740993n,
          timestamp: 1700000000000n,
          byteSize: undefined,
          attributes: 0,
          batchContext: {
            firstOffset: 9007199254740993n,
            firstTimestamp: 1700000000000n,
            maxTimestamp: 1700000000000n,
            producerId: -1n,
            producerEpoch: 0,
            inTransaction: false,
          },
        },
      });
    });

    it('should pass the size of a MessageSet message as its "byteSize"', async () => {
      const eachMessage = vi.fn();
      await adaptKafkajsClient(kafka).consumer().run({ eachMessage });
      const [runConfig] = (consumer.run as ReturnType<typeof vi.fn>).mock
        .calls[0];

      await runConfig.eachMessage({
        topic: 'topic',
        partition: 0,
        message: { offset: '1', timestamp: '2', size: 5, value: null },
      });

      expect(eachMessage.mock.calls[0][0].message).toEqual({
        offset: 1n,
        timestamp: 2n,
        byteSize: 5,
        value: null,
        batchContext: undefined,
      });
    });

    it('should commit and seek offsets as strings', async () => {
      const adapted = adaptKafkajsClient(kafka).consumer();

      await adapted.commitOffsets([
        { topic: 'topic', partition: 0, offset: 10n },
      ]);
      await adapted.seek({ topic: 'topic', partition: 1, offset: 20n });

      expect(consumer.commitOffsets).toHaveBeenCalledExactlyOnceWith([
        { topic: 'topic', partition: 0, offset: '10' },
      ]);
      expect(consumer.seek).toHaveBeenCalledExactlyOnceWith({
        topic: 'topic',
        partition: 1,
        offset: '20',
      });
    });

    it('should pass the other members through', () => {
      const adapted = adaptKafkajsClient(kafka).consumer();

      expect(adapted.connect).toBe(consumer.connect);
      expect(adapted.events).toBe(consumer.events);
    });
  });

  describe('producer', () => {
    it('should send timestamps as strings and report bigint offsets', async () => {
      (producer.send as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          topicName: 'topic',
          partition: 0,
          errorCode: 0,
          baseOffset: '42',
          logAppendTime: '-1',
          logStartOffset: '0',
        },
      ]);

      const metadata = await adaptKafkajsClient(kafka)
        .producer()
        .send({
          topic: 'topic',
          messages: [{ value: 'a', timestamp: 1700000000000 }, { value: 'b' }],
        });

      expect(producer.send).toHaveBeenCalledExactlyOnceWith({
        topic: 'topic',
        messages: [{ value: 'a', timestamp: '1700000000000' }, { value: 'b' }],
      });
      expect(metadata).toEqual([
        {
          topicName: 'topic',
          partition: 0,
          errorCode: 0,
          baseOffset: 42n,
          logAppendTime: -1n,
          logStartOffset: 0n,
        },
      ]);
    });

    it('should report the offset of a broker that only sends "offset"', async () => {
      (producer.sendBatch as ReturnType<typeof vi.fn>).mockResolvedValue([
        { topicName: 'topic', partition: 0, errorCode: 0, offset: '7' },
      ]);

      const metadata = await adaptKafkajsClient(kafka)
        .producer()
        .sendBatch({
          topicMessages: [{ topic: 'topic', messages: [{ value: 'a' }] }],
        });

      expect(producer.sendBatch).toHaveBeenCalledExactlyOnceWith({
        topicMessages: [{ topic: 'topic', messages: [{ value: 'a' }] }],
      });
      expect(metadata).toEqual([
        {
          topicName: 'topic',
          partition: 0,
          errorCode: 0,
          baseOffset: 7n,
          logAppendTime: undefined,
          logStartOffset: undefined,
        },
      ]);
    });
  });

  it('should pass the admin and the logger of kafkajs through', () => {
    const adapted = adaptKafkajsClient(kafka);

    expect(adapted.admin()).toBe('admin');
    expect(adapted.logger()).toBe('logger');
  });
});
