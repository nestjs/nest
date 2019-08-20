import { Body, Controller, HttpCode, Post, Query, OnModuleInit } from '@nestjs/common';
import {
  Client,
  ClientProxy,
  EventPattern,
  MessagePattern,
  Transport,
  MessageRequest,
} from '@nestjs/microservices';
import { Logger } from '@nestjs/common/services/logger.service';
import * as util from 'util';

import { Observable } from 'rxjs';
import * as Bluebird from 'bluebird';

@Controller()
export class KafkaController implements OnModuleInit {
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

  public async onModuleInit(){
    await this.client.connect();
  }

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

    // await Bluebird.delay(30000);

    this.logger.error(util.format('@Query math.sum result %o', result));

    return result.value;
  }

  @MessagePattern('math.sum')
  mathSum(data: any){
    this.logger.error(util.format('@MessagePattern math.sum data %o', data));

    return (data.value.numbers || []).reduce((a, b) => a + b);
  }

  @Post('notify')
  async sendNotification(): Promise<any> {
    return this.client.emit('notify', {notify: true});
  }

  @EventPattern('notify')
  eventHandler(data: any) {
    KafkaController.IS_NOTIFIED = data.value.notify;
  }
}
