import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';

export class InvalidKafkaClientTopicException extends RuntimeException {
  constructor(topic?: string) {
    super(
      `The client consumer didn't subscribe to the corresponding reply topic (${topic}).`,
    );
  }
}
