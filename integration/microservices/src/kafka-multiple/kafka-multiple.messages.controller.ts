import {
  Body,
  Controller,
  OnModuleDestroy,
  OnModuleInit,
  Post,
} from '@nestjs/common';
import { Logger } from '@nestjs/common/services/logger.service';
import { Observable } from 'rxjs';
import {
  Client,
  ClientKafka,
  MessagePattern,
  Transport,
} from '@nestjs/microservices';
import { Payload } from '../../../../packages/microservices';

@Controller()
export class KafkaMultipleMessagesController {
  protected readonly logger = new Logger(KafkaMultipleMessagesController.name);

  @MessagePattern('math.plus.one')
  public mathPlusOne(data: any): any {
    return Number.parseInt(data.value) + 1;
  }
}
