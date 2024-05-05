import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern } from '@nestjs/microservices';
import { BusinessDto } from './dtos/business.dto';
import { UserDto } from './dtos/user.dto';
import { BusinessEntity } from './entities/business.entity';
import { UserEntity } from './entities/user.entity';
import { RdKafkaController } from './rd-kafka.controller';

@Controller()
export class RdKafkaMessagesController {
  protected readonly logger = new Logger(RdKafkaMessagesController.name);
  static IS_NOTIFIED = false;

  @MessagePattern('math.sum.sync.kafka.message')
  mathSumSyncKafkaMessage(data: any) {
    return (data.value.numbers || []).reduce((a, b) => a + b);
  }

  @MessagePattern('math.sum.sync.without.key')
  mathSumSyncWithoutKey(data: any) {
    return (data.value.numbers || []).reduce((a, b) => a + b);
  }

  @MessagePattern('math.sum.sync.plain.object')
  mathSumSyncPlainObject(data: any) {
    return (data.value.numbers || []).reduce((a, b) => a + b);
  }

  @MessagePattern('math.sum.sync.array')
  mathSumSyncArray(data: any) {
    return (data.value || []).reduce((a, b) => a + b);
  }

  @MessagePattern('math.sum.sync.string')
  mathSumSyncString(data: any) {
    // this.logger.error(util.format('mathSumSyncString() data: %o', data));
    return (data.value.split(',') || [])
      .map(i => {
        return parseFloat(i);
      })
      .reduce((a, b) => a + b);
  }

  @MessagePattern('math.sum.sync.number')
  mathSumSyncNumber(data: any) {
    // this.logger.error(util.format('mathSumSyncNumber() data: %o', data));
    return (data.value.toString().split('') || [])
      .map(i => {
        return parseFloat(i);
      })
      .reduce((a, b) => a + b);
  }

  @EventPattern('notify')
  eventHandler(data: any) {
    RdKafkaController.IS_NOTIFIED = data.value.notify;
  }

  // Complex data to send.
  @MessagePattern('user.create')
  async createUser(params: { value: { user: UserDto } }) {
    return new UserEntity(params.value.user);
  }

  @MessagePattern('business.create')
  async createBusiness(params: { value: { business: BusinessDto } }) {
    return new BusinessEntity(params.value.business);
  }
}
