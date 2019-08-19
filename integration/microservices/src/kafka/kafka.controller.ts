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
import * as uuid from 'uuid';
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

  private parse(data: any) {
    data.key = data.key.toString();
    data.value = JSON.parse(data.value.toString());
  }

  // @Post()
  // @HttpCode(200)
  // async call(
  //   @Query('command') cmd,
  //   @Body() data: number[],
  // ): Promise<Observable<any>> {
  //   const key = uuid.v4(); // stick to a single partition

  //   const result = await this.client.emit('math.sum', data.map((num) => {
  //     return {
  //         key,
  //         value: num.toString(),
  //         headers: {
  //           'correlation-id': key,
  //         },
  //     };
  //   })).toPromise();

  //   this.logger.error(util.format('@Query math.sum result %o', result));

  //   return result;
  // }

  // @EventPattern('math.sum')
  // mathSum(data: any){
  //   this.logger.error(util.format('@EventPattern math.sum data %o', data));

  //   KafkaController.MATH_SUM += parseFloat(data.value);
  // }

  @Post()
  @HttpCode(200)
  @MessageRequest('math.sum', 'math.sum.reply')
  async call(
    @Query('command') cmd,
    @Body() data: number[],
  ): Promise<Observable<any>> {
    const key = uuid.v4(); // stick to a single partition

    const result = await this.client.send('math.sum', {
      key: '1',
      value: JSON.stringify({
        numbers: data,
      }),
    }).toPromise();

    await Bluebird.delay(30000);

    // this.logger.error(util.format('@Query math.sum result %o', result));

    const sum = JSON.parse(result.value.toString());

    return sum.result;
  }

  @MessagePattern('math.sum')
  mathSum(data: any){
    // this.logger.error(util.format('@MessagePattern math.sum data %o', data));

    const value = JSON.parse(data.value);

    return {
      value: JSON.stringify({
        result: (value.numbers || []).reduce((a, b) => a + b),
      }),
    };
  }

  @Post('notify')
  @MessageRequest('test.one', 'test.one.reply')
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

    KafkaController.IS_NOTIFIED = data.value.notify;
  }
}
