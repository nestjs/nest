import * as util from 'util';
import { Controller } from '@nestjs/common';
import { Client, ClientProxy, EventPattern, MessagePattern, MessageRequest, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common/services/logger.service';
import { KafkaController } from './kafka.controller';
import { BusinessDto } from './dtos/business.dto';
import { UserEntity } from './entities/user.entity';
import { BusinessEntity } from './entities/business.entity';
import { UserDto } from './dtos/user.dto';
import { KafkaClient } from 'kafka-node';
import { map } from 'bluebird';

@Controller()
export class KafkaMessagesController {
  protected readonly logger = new Logger(KafkaMessagesController.name);
  static IS_NOTIFIED = false;
  static MATH_SUM = 0;

  @Client({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: ['localhost:9092'],
      },
    },
  })
  private readonly client: ClientProxy;

  @MessagePattern('math.sum.sync.kafka.message')
  mathSumSyncKafkaMessage(data: any){
    return (data.value.numbers || []).reduce((a, b) => a + b);
  }

  @MessagePattern('math.sum.sync.without.key')
  mathSumSyncWithoutKey(data: any){
    return (data.value.numbers || []).reduce((a, b) => a + b);
  }

  @MessagePattern('math.sum.sync.plain.object')
  mathSumSyncPlainObject(data: any){
    return (data.value.numbers || []).reduce((a, b) => a + b);
  }

  @MessagePattern('math.sum.sync.array')
  mathSumSyncArray(data: any){
    return (data.value || []).reduce((a, b) => a + b);
  }

  @MessagePattern('math.sum.sync.string')
  mathSumSyncString(data: any){
    // this.logger.error(util.format('mathSumSyncString() data: %o', data));
    return (data.value.split(',') || []).map((i) => {
      return parseFloat(i);
    }).reduce((a, b) => a + b);
  }

  @MessagePattern('math.sum.sync.number')
  mathSumSyncNumber(data: any){
    // this.logger.error(util.format('mathSumSyncNumber() data: %o', data));
    return (data.value.toString().split('') || []).map((i) => {
      return parseFloat(i);
    }).reduce((a, b) => a + b);
  }

  @EventPattern('notify')
  eventHandler(data: any) {
    KafkaController.IS_NOTIFIED = data.value.notify;
  }

  // Complex data to send.
  @MessagePattern('user.create')
  async createUser(params: {value: { user: UserDto } }) {
    return new UserEntity(params.value.user);
  }

  @MessagePattern('business.create')
  async createBusiness(params: {value: {business: BusinessDto}}) {
    return new BusinessEntity(params.value.business);
  }

  async doSomething() {
  }
}
