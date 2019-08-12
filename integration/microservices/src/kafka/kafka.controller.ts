import { Body, Controller, HttpCode, Post, Query, OnModuleInit } from '@nestjs/common';
import {
  Client,
  ClientProxy,
  EventPattern,
  Transport,
} from '@nestjs/microservices';
import { Observable } from 'rxjs';

import * as uuid from 'uuid';

@Controller()
export class KafkaController implements OnModuleInit {
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

  public async onModuleInit(){
    await this.client.connect();
  }

  private parse(data: any) {
    data.message.key = data.message.key.toString();
    data.message.value = JSON.parse(data.message.value.toString());
  }

  @Post()
  @HttpCode(200)
  async call(
    @Query('command') cmd,
    @Body() data: number[],
  ): Promise<Observable<any>> {
    return this.client.emit('math.sum', data.map((num) => {
      return {
          key: uuid.v4(), // stick to a single partition
          value: num.toString(),
      };
    }));
  }

  @EventPattern('math.sum')
  mathSum(data: any){
    KafkaController.MATH_SUM += parseFloat(data.message.value);
  }

  @Post('notify')
  async sendNotification(): Promise<any> {
    return this.client.emit('notification', [{
      key: 'notify',
      value: JSON.stringify({
        notify: true,
      }),
    }]);
  }

  @EventPattern('notification')
  eventHandler(data: any) {
    this.parse(data);

    KafkaController.IS_NOTIFIED = data.message.value.notify;
  }
}
