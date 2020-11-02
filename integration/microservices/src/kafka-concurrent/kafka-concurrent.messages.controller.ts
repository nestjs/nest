import * as util from 'util';

import { Controller } from '@nestjs/common';
import { Logger } from '@nestjs/common/services/logger.service';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class KafkaConcurrentMessagesController {
  protected readonly logger = new Logger(KafkaConcurrentMessagesController.name);

  @MessagePattern('math.sum.sync.number.wait')
  async mathSumSyncNumberWait(data: any) {
    // debug
    // this.logger.error(util.format('mathSumSyncNumberWait() partition: %o replyPartition: %o', data.partition, data.headers.kafka_replyPartition));

    return new Promise((resolve) => {
      setTimeout(() => {
        const result = data.value[0] + data.value[1];

        return resolve(result);
      }, 15000);
    });
  }
}
