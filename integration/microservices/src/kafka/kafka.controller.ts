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

  @Post()
  @HttpCode(200)
  @MessageRequest('math.sum', 'math.sum.reply')
  async call(
    @Query('command') cmd,
    @Body() data: number[],
  ): Promise<Observable<any>> {
    const result = await this.client.send('math.sum', {
      key: '1',
      value: {
        numbers: data,
      },
    }).toPromise();
    return result.value;
  }

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
