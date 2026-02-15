import { ClientProxy } from '../client/index.js';
import { KafkaStatus } from '../events/index.js';
import {
  Consumer,
  Producer,
  TopicPartitionOffsetAndMetadata,
} from '../external/kafka.interface.js';

export interface ClientKafkaProxy extends Omit<
  ClientProxy<never, KafkaStatus>,
  'on'
> {
  /**
   * Reference to the Kafka consumer instance.
   */
  consumer: Consumer | null;
  /**
   * Reference to the Kafka producer instance.
   */
  producer: Producer | null;
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
    topicPartitions: TopicPartitionOffsetAndMetadata[],
  ): Promise<void>;
}
