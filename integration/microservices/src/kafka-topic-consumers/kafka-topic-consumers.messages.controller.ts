import { Controller, HttpCode, Post } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { BehaviorSubject } from 'rxjs';
import { first, skipWhile } from 'rxjs/operators';

@Controller()
export class KafkaTopicConsumersMessagesController {
  static TOPIC_A_PROCESSED = false;
  static TOPIC_B_PROCESSED = false;

  public waiting = new BehaviorSubject<boolean>(false);

  @Post('block-a')
  @HttpCode(200)
  blockA() {
    this.waiting.next(true);
  }

  @Post('release-a')
  @HttpCode(200)
  releaseA() {
    this.waiting.next(false);
  }

  @EventPattern('topic-consumers.topic-a')
  async handleTopicA(): Promise<void> {
    await new Promise<void>(resolve => {
      this.waiting
        .pipe(
          skipWhile(isWaiting => isWaiting),
          first(),
        )
        .subscribe(() => resolve());
    });
    KafkaTopicConsumersMessagesController.TOPIC_A_PROCESSED = true;
  }

  @EventPattern('topic-consumers.topic-b')
  handleTopicB(): void {
    KafkaTopicConsumersMessagesController.TOPIC_B_PROCESSED = true;
  }
}
