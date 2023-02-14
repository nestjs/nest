/**
 * @see https://docs.spring.io/spring-kafka/api/org/springframework/kafka/support/KafkaHeaders.html
 *
 * @publicApi
 */
export enum KafkaHeaders {
  ACKNOWLEDGMENT = 'kafka_acknowledgment',
  BATCH_CONVERTED_HEADERS = 'kafka_batchConvertedHeaders',
  CONSUMER = 'kafka_consumer',
  CORRELATION_ID = 'kafka_correlationId',
  DELIVERY_ATTEMPT = 'kafka_deliveryAttempt',
  DLT_EXCEPTION_FQCN = 'kafka_dlt-exception-fqcn',
  DLT_EXCEPTION_MESSAGE = 'kafka_dlt-exception-message',
  DLT_EXCEPTION_STACKTRACE = 'kafka_dlt-exception-stacktrace',
  DLT_ORIGINAL_OFFSET = 'kafka_dlt-original-offset',
  DLT_ORIGINAL_PARTITION = 'kafka_dlt-original-partition',
  DLT_ORIGINAL_TIMESTAMP = 'kafka_dlt-original-timestamp',
  DLT_ORIGINAL_TIMESTAMP_TYPE = 'kafka_dlt-original-timestamp-type',
  DLT_ORIGINAL_TOPIC = 'kafka_dlt-original-topic',
  GROUP_ID = 'kafka_groupId',
  MESSAGE_KEY = 'kafka_messageKey',
  NATIVE_HEADERS = 'kafka_nativeHeaders',
  OFFSET = 'kafka_offset',
  PARTITION_ID = 'kafka_partitionId',
  PREFIX = 'kafka_',
  RAW_DATA = 'kafka_data',
  RECEIVED = 'kafka_received',
  RECEIVED_MESSAGE_KEY = 'kafka_receivedMessageKey',
  RECEIVED_PARTITION_ID = 'kafka_receivedPartitionId',
  RECEIVED_TIMESTAMP = 'kafka_receivedTimestamp',
  RECEIVED_TOPIC = 'kafka_receivedTopic',
  RECORD_METADATA = 'kafka_recordMetadata',
  REPLY_PARTITION = 'kafka_replyPartition',
  REPLY_TOPIC = 'kafka_replyTopic',
  TIMESTAMP = 'kafka_timestamp',
  TIMESTAMP_TYPE = 'kafka_timestampType',
  TOPIC = 'kafka_topic',

  // framework specific headers
  NEST_ERR = 'kafka_nest-err',
  NEST_IS_DISPOSED = 'kafka_nest-is-disposed',
}
