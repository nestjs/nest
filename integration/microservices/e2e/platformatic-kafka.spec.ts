import {
  ClientKafka,
  KafkaContext,
  KafkaRetriableException,
  ServerKafka,
} from '@nestjs/microservices';
import { Consumer, Producer } from '@platformatic/kafka';
import { randomUUID } from 'crypto';
import { Kafka, logLevel } from 'kafkajs';
import { lastValueFrom } from 'rxjs';

// Kafka suites are otherwise skipped in CI because the broker is unreliable
// there. Set KAFKA_BROKER=localhost:9092 to run this against the integration broker.
describe.skipIf(!process.env.KAFKA_BROKER)(
  'Kafka transport on @platformatic/kafka',
  () => {
    const broker = process.env.KAFKA_BROKER ?? 'localhost:9092';
    const silentLogger = { error() {}, warn() {}, log() {}, debug() {} };
    const kafka = new Kafka({ brokers: [broker], logLevel: logLevel.NOTHING });
    const admin = kafka.admin();
    let suffix: string;
    let topics: string[];
    let closables: { close(): Promise<void> }[];

    beforeAll(() => admin.connect());
    afterAll(() => admin.disconnect());

    beforeEach(() => {
      suffix = randomUUID();
      topics = [];
      closables = [];
    });

    afterEach(async () => {
      await Promise.allSettled(closables.map(closable => closable.close()));
      await admin.deleteTopics({ topics }).catch(() => undefined);
    });

    const createTopics = async (...names: string[]) => {
      topics.push(...names);
      await admin.createTopics({
        topics: names.map(topic => ({ topic, numPartitions: 2 })),
      });
    };

    const listen = async (server: ServerKafka) => {
      (server as any).logger = silentLogger;
      closables.push(server);
      await new Promise<void>((resolve, reject) => {
        void server.listen(error => (error ? reject(error) : resolve()));
      });
    };

    const platformaticServer = () =>
      new ServerKafka({
        driver: 'platformatic',
        client: { bootstrapBrokers: [broker], clientId: `server-${suffix}` },
        consumer: { groupId: `group-${suffix}` },
        subscribe: { fallbackMode: 'earliest' },
      });

    const platformaticClient = () =>
      new ClientKafka({
        driver: 'platformatic',
        client: { bootstrapBrokers: [broker], clientId: `client-${suffix}` },
        consumer: { groupId: `group-${suffix}` },
      });

    const connect = async (client: ClientKafka, ...patterns: string[]) => {
      (client as any).logger = silentLogger;
      closables.push(client);
      patterns.forEach(pattern => client.subscribeToResponseOf(pattern));
      await client.connect();
    };

    it('should answer a request and hand an event to its handler', async () => {
      const requestTopic = `sum-${suffix}`;
      const eventTopic = `notify-${suffix}`;
      await createTopics(requestTopic, `${requestTopic}.reply`, eventTopic);
      let eventContext!: KafkaContext<'platformatic'>;
      const server = platformaticServer();
      server.addHandler(requestTopic, async (numbers: number[]) =>
        numbers.reduce((sum, value) => sum + value, 0),
      );
      const eventHandled = new Promise<unknown>(resolve =>
        server.addHandler(
          eventTopic,
          async (data: unknown, context: KafkaContext<'platformatic'>) => {
            eventContext = context;
            resolve(data);
          },
          true,
        ),
      );
      await listen(server);
      const client = platformaticClient();
      await connect(client, requestTopic);

      // The parser decodes objects and arrays only, as on kafkajs
      expect(await lastValueFrom(client.send(requestTopic, [1, 2, 3]))).toBe(
        '6',
      );

      await lastValueFrom(client.emit(eventTopic, { id: 1 }));

      expect(await eventHandled).toEqual({ id: 1 });
      expect(typeof eventContext.getMessage().offset).toBe('bigint');
      expect(eventContext.getConsumer()).toBeInstanceOf(Consumer);
      expect(eventContext.getProducer()).toBeInstanceOf(Producer);
      expect(client.producer).toBeInstanceOf(Producer);
    });

    it('should deliver a message again when its handler fails', async () => {
      const topic = `retry-${suffix}`;
      await createTopics(topic);
      const attempts: unknown[] = [];
      const server = platformaticServer();
      const handled = new Promise<void>(resolve =>
        server.addHandler(
          topic,
          async (data: unknown) => {
            attempts.push(data);
            if (attempts.length === 1) {
              throw new KafkaRetriableException('not yet');
            }
            resolve();
          },
          true,
        ),
      );
      await listen(server);
      const producer = kafka.producer();
      await producer.connect();
      await producer.send({ topic, messages: [{ value: 'payload' }] });
      await producer.disconnect();

      await handled;

      expect(attempts).toEqual(['payload', 'payload']);
    });

    it('should consume the existing topics that a regex pattern matches', async () => {
      const topic = `regex-${suffix}`;
      await createTopics(topic);
      const server = platformaticServer();
      const handled = new Promise<unknown>(resolve =>
        server.addHandler(
          new RegExp(`^regex-${suffix}$`),
          async (data: unknown) => resolve(data),
          true,
        ),
      );
      await listen(server);
      const producer = kafka.producer();
      await producer.connect();
      await producer.send({ topic, messages: [{ value: '{"id":2}' }] });
      await producer.disconnect();

      expect(await handled).toEqual({ id: 2 });
    });

    it('should commit the offsets of the messages handled when it closes', async () => {
      const topic = `commit-${suffix}`;
      await createTopics(topic);
      const server = platformaticServer();
      let handledCount = 0;
      server.addHandler(topic, async () => void handledCount++, true);
      await listen(server);
      const producer = kafka.producer();
      await producer.connect();
      await producer.send({
        topic,
        messages: [
          { value: 'a', partition: 0 },
          { value: 'b', partition: 0 },
        ],
      });
      await producer.disconnect();
      await expect.poll(() => handledCount, { timeout: 20_000 }).toBe(2);

      await server.close();

      const [offsets] = await admin.fetchOffsets({
        groupId: `group-${suffix}-server`,
        topics: [topic],
      });
      expect(
        offsets.partitions.find(({ partition }) => partition === 0)?.offset,
      ).toBe('2');
    });

    it('should leave the commits to the handlers with "autoCommit" off', async () => {
      const topic = `manual-${suffix}`;
      await createTopics(topic);
      const server = new ServerKafka({
        driver: 'platformatic',
        client: { bootstrapBrokers: [broker], clientId: `server-${suffix}` },
        consumer: { groupId: `group-${suffix}` },
        subscribe: { fallbackMode: 'earliest' },
        run: { autoCommit: false },
      });
      const committed = new Promise<void>(resolve =>
        server.addHandler(
          topic,
          async (_data: unknown, context: KafkaContext<'platformatic'>) => {
            const { offset, leaderEpoch } = context.getMessage();
            await context.getConsumer().commit({
              offsets: [
                {
                  topic: context.getTopic(),
                  partition: context.getPartition(),
                  offset: offset + 1n,
                  leaderEpoch,
                },
              ],
            });
            resolve();
          },
          true,
        ),
      );
      await listen(server);
      const producer = kafka.producer();
      await producer.connect();
      await producer.send({ topic, messages: [{ value: 'a', partition: 1 }] });
      await producer.disconnect();
      await committed;

      const [offsets] = await admin.fetchOffsets({
        groupId: `group-${suffix}-server`,
        topics: [topic],
      });
      expect(
        offsets.partitions.find(({ partition }) => partition === 1)?.offset,
      ).toBe('1');
    });

    describe('next to kafkajs', () => {
      const answer = async (server: ServerKafka, client: ClientKafka) => {
        const topic = `mixed-${suffix}`;
        await createTopics(topic, `${topic}.reply`);
        server.addHandler(topic, async (data: string) => `${data}!`);
        await listen(server);
        await connect(client, topic);

        expect(await lastValueFrom(client.send(topic, 'hello'))).toBe('hello!');
      };

      it('should answer a kafkajs client', () =>
        answer(
          platformaticServer(),
          new ClientKafka({
            client: { brokers: [broker], logLevel: logLevel.NOTHING },
            consumer: { groupId: `group-${suffix}` },
          }),
        ));

      it('should share a consumer group with a kafkajs server', async () => {
        const topic = `shared-${suffix}`;
        await createTopics(topic);
        const handled: string[] = [];
        const servers = [
          platformaticServer(),
          new ServerKafka({
            client: { brokers: [broker], logLevel: logLevel.NOTHING },
            consumer: { groupId: `group-${suffix}` },
            subscribe: { fromBeginning: true },
          }),
        ];
        servers.forEach((server, index) =>
          server.addHandler(
            topic,
            async () => void handled.push(String(index)),
            true,
          ),
        );
        // Both join the group of the other: their protocols have to match
        await Promise.all(servers.map(server => listen(server)));
        const producer = kafka.producer();
        await producer.connect();
        await producer.send({
          topic,
          messages: [
            { value: 'a', partition: 0 },
            { value: 'b', partition: 1 },
          ],
        });
        await producer.disconnect();

        await expect
          .poll(() => [...handled].sort(), { timeout: 20_000 })
          .toEqual(['0', '1']);
      });

      it('should be answered by a kafkajs server', () =>
        answer(
          new ServerKafka({
            client: { brokers: [broker], logLevel: logLevel.NOTHING },
            consumer: { groupId: `group-${suffix}` },
            subscribe: { fromBeginning: true },
          }),
          platformaticClient(),
        ));
    });
  },
);
