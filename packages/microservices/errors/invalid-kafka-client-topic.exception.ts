import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';

export class InvalidKafkaClientTopicException extends RuntimeException {
  constructor(topic?: string) {
    super(`The client consumer is not subscribed to the topic (${topic}).`);
  }
}
