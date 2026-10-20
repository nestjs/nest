/**
 * @publicApi
 */
export class MaxKafkaHeadersExceededException extends Error {
  constructor(count: number, maxCount: number) {
    super(
      `The Kafka message has ${count} header values, which exceeds the maximum allowed ${maxCount}`,
    );
  }
}
