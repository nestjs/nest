import * as util from 'util';
import { Body, Controller, HttpCode, Post, Query } from '@nestjs/common';
import {
  Client,
  ClientProxy,
  Transport,
  MessageRequest,
} from '@nestjs/microservices';
import { Logger } from '@nestjs/common/services/logger.service';

import { Observable } from 'rxjs';
import { UserDto } from './dtos/user.dto';
import { BusinessDto } from './dtos/business.dto';

@Controller()
export class KafkaController {
  protected readonly logger = new Logger(KafkaController.name);
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

  // sync send kafka message
  @Post('mathSumSyncKafkaMessage')
  @HttpCode(200)
  @MessageRequest('math.sum.sync.kafka.message', 'math.sum.sync.kafka.message.reply')
  async mathSumSyncKafkaMessage(
    @Body() data: number[],
  ): Promise<Observable<any>> {
    const result = await this.client.send('math.sum.sync.kafka.message', {
      key: '1',
      value: {
        numbers: data,
      },
    }).toPromise();
    return result.value;
  }

  // sync send kafka(ish) message without key and only the value
  @Post('mathSumSyncWithoutKey')
  @HttpCode(200)
  @MessageRequest('math.sum.sync.without.key', 'math.sum.sync.without.key.reply')
  async mathSumSyncWithoutKey(
    @Body() data: number[],
  ): Promise<Observable<any>> {
    const result = await this.client.send('math.sum.sync.without.key', {
      value: {
        numbers: data,
      },
    }).toPromise();
    return result.value;
  }

  // sync send message without key or value
  @Post('mathSumSyncPlainObject')
  @HttpCode(200)
  @MessageRequest('math.sum.sync.plain.object', 'math.sum.sync.plain.object.reply')
  async mathSumSyncPlainObject(
    @Body() data: number[],
  ): Promise<Observable<any>> {
    const result = await this.client.send('math.sum.sync.plain.object', {
      numbers: data,
    }).toPromise();
    return result.value;
  }

  // sync send message without key or value
  @Post('mathSumSyncArray')
  @HttpCode(200)
  @MessageRequest('math.sum.sync.array', 'math.sum.sync.array.reply')
  async mathSumSyncArray(
    @Body() data: number[],
  ): Promise<Observable<any>> {
    const result = await this.client.send('math.sum.sync.array', data).toPromise();
    return result.value;
  }

  @Post('mathSumSyncString')
  @HttpCode(200)
  @MessageRequest('math.sum.sync.string', 'math.sum.sync.string.reply')
  async mathSumSyncString(
    @Body() data: number[],
  ): Promise<Observable<any>> {
    // this.logger.error(util.format('mathSumSyncString() data: %o', data));
    const result = await this.client.send('math.sum.sync.string', data.toString()).toPromise();
    return result.value;
  }

  @Post('mathSumSyncNumber')
  @HttpCode(200)
  @MessageRequest('math.sum.sync.number', 'math.sum.sync.number.reply')
  async mathSumSyncNumber(
    @Body() data: number[],
  ): Promise<Observable<any>> {
    const result = await this.client.send('math.sum.sync.number', data[0]).toPromise();
    return result.value;
  }

  // async notify
  @Post('notify')
  async sendNotification(): Promise<any> {
    return this.client.emit('notify', {notify: true});
  }

  // Complex data to send.
  @Post('/user')
  @HttpCode(200)
  @MessageRequest('user.create', 'user.create.reply')
  async createUser(@Body() user: UserDto): Promise<Observable<any>> {
    const result = await this.client.send('user.create', {
      key: '1',
      value: {
        user,
      },
    }).toPromise();
    return result.value;
  }

  // Complex data to send.
  @Post('/business')
  @HttpCode(200)
  @MessageRequest('business.create', 'business.create.reply')
  async createBusiness(@Body() business: BusinessDto) {
    const result = await this.client.send('business.create', {
      key: '1',
      value: {
        business,
      },
    }).toPromise();
    return result.value;
  }
}
