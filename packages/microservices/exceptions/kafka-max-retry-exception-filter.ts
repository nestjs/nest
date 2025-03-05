import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { KafkaContext } from '../ctx-host';

@Catch()
export class KafkaMaxRetryExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(KafkaMaxRetryExceptionFilter.name);

  constructor(
    private readonly maxRetries: number,
    // Optional custom function executed when max retries are exceeded
    private readonly skipHandler?: (message: any) => Promise<void>,
  ) {
    super();
  }

  async catch(exception: unknown, host: ArgumentsHost) {
    const kafkaContext = host.switchToRpc().getContext<KafkaContext>();
    const message = kafkaContext.getMessage();

    // Assume that the retryCount can be retrieved from the KafkaContext (or message headers)
    const currentRetryCount = this.getRetryCountFromContext(kafkaContext);

    if (currentRetryCount >= this.maxRetries) {
      this.logger.warn(
        `Max retries (${this.maxRetries}) exceeded for message: ${JSON.stringify(message)}`,
      );

      if (this.skipHandler) {
        try {
          await this.skipHandler(message);
        } catch (err) {
          this.logger.error('Error in skipHandler:', err);
        }
      }

      // Attempt to commit the message offset
      try {
        await this.commitOffset(kafkaContext);
      } catch (commitError) {
        this.logger.error('Failed to commit offset:', commitError);
      }
      return; // Stop propagating the exception
    }

    // If retry count is below the maximum, proceed with the default Exception Filter logic
    super.catch(exception, host);
  }

  // Extracts retryCount from the KafkaContext or message headers
  private getRetryCountFromContext(context: KafkaContext): number {
    // In newer KafkaJS versions, retryCount may be included in the message headers.
    // This is an example; adjust it according to the KafkaJS version in use.
    const headers = context.getMessage().headers || {};
    const retryHeader = headers['retryCount'] || headers['retry-count'];
    return retryHeader ? Number(retryHeader) : 0;
  }

  // Commits the offset of the message (dependent on the KafkaJS API)
  private async commitOffset(context: KafkaContext): Promise<void> {
    // The actual implementation may vary depending on the KafkaJS version and consumer instance
    const consumer = context.getConsumer && context.getConsumer();
    if (!consumer) {
      throw new Error('Consumer instance is not available from KafkaContext.');
    }

    const topic = context.getTopic && context.getTopic();
    const partition = context.getPartition && context.getPartition();
    const message = context.getMessage();
    const offset = message.offset;

    if (!topic || partition === undefined || offset === undefined) {
      throw new Error(
        'Incomplete Kafka message context for committing offset.',
      );
    }

    // Example commitOffsets call. Adjust according to the actual API.
    await consumer.commitOffsets([
      {
        topic,
        partition,
        // When committing an offset, commit the next number (i.e., current offset + 1)
        offset: (Number(offset) + 1).toString(),
      },
    ]);
  }
}
