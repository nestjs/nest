/**
 * Presents a kafkajs client in the shape the Kafka transport works with, the
 * one of kafka-core: offsets and timestamps are bigint values, those of a
 * received message's `batchContext` included. Values go back to kafkajs as
 * the strings it expects. This covers what the transport uses and what it
 * hands to applications (the consumer and producer of `KafkaContext`,
 * `ClientKafka` and `unwrap()`): receiving with `eachMessage`, committing and
 * seeking offsets, and sending. Everything else is kafkajs as it is: the
 * admin client, transactions and the payloads of instrumentation events
 * keep string offsets, and the methods and `run()` options that only
 * kafka-core has are missing or ignored.
 */
export function adaptKafkajsClient(kafka: any) {
  return {
    producer: (config?: unknown) => adaptProducer(kafka.producer(config)),
    consumer: (config?: unknown) => adaptConsumer(kafka.consumer(config)),
    admin: (config?: unknown) => kafka.admin(config),
    logger: () => kafka.logger(),
  };
}

function adaptConsumer(consumer: any) {
  return {
    ...consumer,
    run: (config: any = {}) =>
      consumer.run({
        ...config,
        eachMessage:
          config.eachMessage &&
          ((payload: any) =>
            config.eachMessage({
              ...payload,
              message: toKafkaCoreMessage(payload.message),
            })),
      }),
    commitOffsets: (topicPartitions: any[]) =>
      consumer.commitOffsets(
        topicPartitions.map(topicPartition => ({
          ...topicPartition,
          offset: String(topicPartition.offset),
        })),
      ),
    seek: (seekEntry: any) =>
      consumer.seek({ ...seekEntry, offset: String(seekEntry.offset) }),
  };
}

function adaptProducer(producer: any) {
  return {
    ...producer,
    send: async (record: any) =>
      toRecordMetadata(await producer.send(toKafkajsRecord(record))),
    sendBatch: async (batch: any) =>
      toRecordMetadata(
        await producer.sendBatch({
          ...batch,
          topicMessages: batch.topicMessages?.map(toKafkajsRecord),
        }),
      ),
  };
}

// The fields of a record batch that kafkajs reads as strings
const BATCH_CONTEXT_INTEGERS = [
  'firstOffset',
  'firstTimestamp',
  'maxTimestamp',
  'producerId',
];

/**
 * kafkajs reports a size only for messages in the legacy MessageSet format,
 * so `byteSize` is unset for the others.
 */
function toKafkaCoreMessage({
  offset,
  timestamp,
  size,
  batchContext,
  ...message
}: any) {
  return {
    ...message,
    offset: BigInt(offset),
    timestamp: BigInt(timestamp),
    byteSize: size,
    batchContext: batchContext && toKafkaCoreBatchContext(batchContext),
  };
}

function toKafkaCoreBatchContext(batchContext: Record<string, unknown>) {
  const converted = { ...batchContext };
  for (const field of BATCH_CONTEXT_INTEGERS) {
    if (typeof converted[field] === 'string') {
      converted[field] = BigInt(converted[field]);
    }
  }
  return converted;
}

function toKafkajsRecord(record: any) {
  return {
    ...record,
    messages: record.messages.map((message: any) =>
      message.timestamp === undefined
        ? message
        : { ...message, timestamp: String(message.timestamp) },
    ),
  };
}

function toRecordMetadata(recordMetadata: any[]) {
  return recordMetadata.map(
    ({
      offset,
      timestamp,
      baseOffset,
      logAppendTime,
      logStartOffset,
      ...rest
    }) => ({
      ...rest,
      baseOffset: toBigInt(baseOffset ?? offset),
      logAppendTime: toBigInt(logAppendTime ?? timestamp),
      logStartOffset: toBigInt(logStartOffset),
    }),
  );
}

function toBigInt(value: string | undefined) {
  return value === undefined ? undefined : BigInt(value);
}
