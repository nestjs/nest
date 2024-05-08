import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, MessagePattern, Payload, RdKafkaContext } from '@nestjs/microservices';
import { BusinessDto } from './dtos/business.dto';
import { UserDto } from './dtos/user.dto';
import { BusinessEntity } from './entities/business.entity';
import { UserEntity } from './entities/user.entity';
import { RdKafkaController } from './rd-kafka.controller';

@Controller()
export class RdKafkaMessagesController {
  protected readonly logger = new Logger(RdKafkaMessagesController.name);
  static IS_NOTIFIED = false;

  @EventPattern('notify')
  notify(data: any) {
    // console.log('notify data', data);
    RdKafkaController.IS_NOTIFIED = data.notify;
  }

  @EventPattern('notify.with.key')
  notifyWithKey(@Payload() data: any, @Ctx() context: RdKafkaContext) {
    // console.log('notifyWithKey data', data);
    // console.log('notifyWithKey context', context);
    RdKafkaController.IS_NOTIFIED_WITH_KEY = data.notify;
  }

  @EventPattern('notify.with.key.and.headers')
  notifyWithKeyAndHeaders(@Payload() data: any, @Ctx() context: RdKafkaContext) {
    // console.log('notifyWithKeyAndHeaders data', data);
    // console.log('notifyWithKeyAndHeaders context', context);
    // console.log('notifyWithKeyAndHeaders context message', context.getMessage());
    RdKafkaController.IS_NOTIFIED_WITH_KEY_AND_HEADERS = data.notify;
  }


  @EventPattern('notify.with.key.and.many.headers')
  notifyWithKeyAndManyHeaders(@Payload() data: any, @Ctx() context: RdKafkaContext) {
    // console.log('notifyWithKeyAndHeaders data', data);
    // console.log('notifyWithKeyAndHeaders context', context);
    // console.log('notifyWithKeyAndHeaders context message', context.getMessage());
    RdKafkaController.IS_NOTIFIED_WITH_KEY_AND_MANY_HEADERS = data.notify;
  }

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
