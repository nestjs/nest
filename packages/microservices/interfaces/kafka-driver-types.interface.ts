import type * as Kafkajs from '../external/kafka.interface.js';
import type * as Platformatic from '../external/platformatic-kafka.interface.js';

/**
 * A message as a Kafka server or client running on `@platformatic/kafka`
 * hands it to application code. Its offset and timestamp are bigint values.
 *
 * @publicApi
 */
export interface PlatformaticKafkaMessage {
  key: Buffer | null;
  value: Buffer | null;
  /** A header that a message repeats has its values in an array. */
  headers: Kafkajs.IHeaders;
  offset: bigint;
  timestamp: bigint;
  /** What `@platformatic/kafka` needs to commit the offset of the message. */
  leaderEpoch: number;
}

/**
 * The types a Kafka server or client hands to application code, by the client
 * library it runs on (see the `driver` option). Type parameters such as the
 * one of `KafkaContext` default to `'kafkajs'`.
 *
 * @publicApi
 */
export interface KafkaDriverTypes {
  kafkajs: {
    message: Kafkajs.KafkaMessage;
    consumer: Kafkajs.Consumer;
    producer: Kafkajs.Producer;
    topicPartitionOffsetAndMetadata: Kafkajs.TopicPartitionOffsetAndMetadata;
  };
  platformatic: {
    message: PlatformaticKafkaMessage;
    consumer: Platformatic.Consumer;
    producer: Platformatic.Producer;
    topicPartitionOffsetAndMetadata: Platformatic.CommitOptionsPartition;
  };
}

/**
 * The Kafka client library a Kafka server or client runs on.
 *
 * @publicApi
 */
export type KafkaDriver = keyof KafkaDriverTypes;
