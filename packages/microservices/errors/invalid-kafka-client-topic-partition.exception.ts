import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';

export class InvalidKafkaClientTopicPartitionException extends RuntimeException {
  constructor(topic?: string) {
    super(
      `The client consumer subscribed to the topic (${topic}) whcih is not assigned to any partitions.`,
    );
  }
}
