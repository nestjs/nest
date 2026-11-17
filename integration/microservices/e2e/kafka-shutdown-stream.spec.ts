import { KafkaHeaders, ServerKafka } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { Kafka, logLevel } from 'kafkajs';
import { concat, of, Subject } from 'rxjs';

// Kafka suites are otherwise skipped in CI because the broker is unreliable
// there. Set KAFKA_BROKER=localhost:9092 to run this against the integration broker.
describe.skipIf(!process.env.KAFKA_BROKER)(
  'Kafka response stream shutdown',
  () => {
    it('publishes the final response after the consumer disconnects', async () => {
      const suffix = randomUUID();
      const topic = `shutdown-request-${suffix}`;
      const replyTopic = `${topic}.reply`;
      const groupId = `shutdown-server-${suffix}`;
      const brokers = [process.env.KAFKA_BROKER ?? 'localhost:9092'];
      const kafka = new Kafka({ brokers, logLevel: logLevel.NOTHING });
      const admin = kafka.admin();
      const sender = kafka.producer();
      const reader = kafka.consumer({ groupId: `shutdown-reader-${suffix}` });
      const responses = new Subject<string>();
      const received: string[] = [];
      let firstReply!: () => void;
      const firstReceived = new Promise<void>(
        resolve => (firstReply = resolve),
      );
      const server = new ServerKafka({
        client: { brokers, logLevel: logLevel.NOTHING },
        consumer: { groupId },
        subscribe: { fromBeginning: true },
      });
      (server as any).logger = { error() {}, warn() {}, log() {}, debug() {} };
      server.addHandler(topic, () => concat(of('first'), responses));
      try {
        await admin.connect();
        await admin.createTopics({
          topics: [topic, replyTopic].map(topicName => ({
            topic: topicName,
            numPartitions: 1,
            replicationFactor: 1,
          })),
        });
        await reader.connect();
        await reader.subscribe({ topic: replyTopic, fromBeginning: true });
        await reader.run({
          eachMessage: async ({ message }) => {
            const value = message.value?.toString();
            if (value) received.push(value);
            if (value === 'first') firstReply();
          },
        });
        await new Promise<void>((resolve, reject) => {
          void server.listen(error => (error ? reject(error) : resolve()));
        });
        await sender.connect();
        await sender.send({
          topic,
          messages: [
            {
              value: 'request',
              headers: {
                [KafkaHeaders.CORRELATION_ID]: 'request-1',
                [KafkaHeaders.REPLY_TOPIC]: replyTopic,
                [KafkaHeaders.REPLY_PARTITION]: '0',
              },
            },
          ],
        });
        await firstReceived;
        const [, consumer] = server.unwrap<any[]>();
        const consumerDisconnected = new Promise<void>(resolve => {
          consumer.on(consumer.events.DISCONNECT, resolve);
        });
        const closing = server.close();
        await consumerDisconnected;
        await new Promise(resolve => setImmediate(resolve));
        responses.next('last');
        responses.complete();
        await closing;
        const offsets = await admin.fetchOffsets({
          groupId: `${groupId}-server`,
          topics: [topic],
        });
        expect(offsets[0].partitions[0].offset).toBe('1');
        await expect
          .poll(() => received, { timeout: 5000 })
          .toEqual(['first', 'last']);
      } finally {
        responses.complete();
        try {
          await server.close();
          await admin.deleteTopics({ topics: [topic, replyTopic] });
        } finally {
          await Promise.all([
            reader.disconnect(),
            sender.disconnect(),
            admin.disconnect(),
          ]);
        }
      }
    });
  },
);
