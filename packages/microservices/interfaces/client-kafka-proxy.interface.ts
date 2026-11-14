import { ClientProxy } from '../client/index.js';
import { KafkaStatus } from '../events/index.js';
import { KafkaDriverTypes } from './kafka-driver-types.interface.js';
import { KafkaDriver } from './microservice-configuration.interface.js';

/**
 * A Kafka client. Its consumer and producer are those of the client library it
 * runs on: use `ClientKafkaProxy<'kafka-core'>` on kafka-core.
 */
export interface ClientKafkaProxy<
  TDriver extends KafkaDriver = 'kafkajs',
> extends Omit<ClientProxy<never, KafkaStatus>, 'on'> {
  /**
   * Reference to the Kafka consumer instance.
   */
  consumer: KafkaDriverTypes[TDriver]['consumer'] | null;
  /**
   * Reference to the Kafka producer instance.
   */
  producer: KafkaDriverTypes[TDriver]['producer'] | null;
  /**
   * Subscribes to messages that match the pattern.
   * Required for message-driven communication style between microservices.
   * You can't use `send` without subscribing to the message pattern first.
   * @param pattern Pattern to subscribe to
   */
  subscribeToResponseOf(pattern: unknown): void;
  /**
   * Commits the given offsets.
   * @param topicPartitions Array of topic partitions with their offsets and metadata
   */
  commitOffsets(
    topicPartitions: KafkaDriverTypes[TDriver]['topicPartitionOffsetAndMetadata'][],
  ): Promise<void>;
}
