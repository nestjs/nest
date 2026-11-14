import type * as KafkaCore from '../external/kafka-core.interface.js';
import type * as Kafkajs from '../external/kafka.interface.js';

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
  'kafka-core': {
    message: KafkaCore.KafkaMessage;
    consumer: KafkaCore.Consumer;
    producer: KafkaCore.Producer;
    topicPartitionOffsetAndMetadata: KafkaCore.TopicPartitionOffsetAndMetadata;
  };
}
