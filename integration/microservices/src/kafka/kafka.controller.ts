import * as util from 'util';
import { Body, Controller, Get, HttpCode, Post, Query, Logger } from '@nestjs/common';
import {
  Client,
  ClientProxy,
  EventPattern,
  MessagePattern,
  RpcException,
  Transport,
  KafkaConsumer,
  ClientKafka,
} from '@nestjs/microservices';
import { from, Observable, of, throwError } from 'rxjs';
import { catchError, scan, delay, map } from 'rxjs/operators';
import { Producer } from '@nestjs/common/interfaces/external/kafka-options.interface';

@Controller()
export class KafkaController {
  static IS_NOTIFIED = false;

  @Client({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: ['localhost:9092'],
      },
    },
  })
  private readonly client: ClientProxy;
  // private readonly client: ClientKafka;

  private serialize(data: any) {
    data.message.key = data.message.key.toString();
    data.message.value = JSON.parse(data.message.value.toString());
  }

  @Post()
  @HttpCode(200)
  async call(
    @Query('command') cmd,
    @Body() data: number[],
  ): Promise<Observable<number>> {
    await this.client.connect();
    // return this.client.send<number>(cmd, data);

    return this.client.emit('test.one', [
      {
        key: 'sum',
        value: JSON.stringify({
          values: data,
        }),
        headers: {
          'correlation-id': '2bfb68bb-893a-423b-a7fa-7b568cad5b67',
        },
      },
    ]).pipe(map((result) => {
      Logger.error(util.format('post() result %o', result));

      return 15;
    }), delay(500000));

    // Logger.error(util.format('post() result %o', result));

    // return from(Promise.resolve(15)).pipe(delay(500000));
  }

  @EventPattern('test.one')
  testOne(data: any){
    this.serialize(data);

    Logger.error(util.format('testOne() data %o', data));

    return from(Promise.resolve(15)).pipe(delay(5000));
    // throw new Error('test');
  }

  // @MessagePattern(this.consumer)
  // testTo(data: any){
  //   Logger.error(util.format('testOne() data %o', data));

  //   return from(Promise.resolve(15)).pipe(delay(5000));
  //   // throw new Error('test');
  // }
  // testOne(...data: any){
  //   Logger.error(util.format('testOne() data %o', data));
  //   throw new Error('test');
  // }

  // @Post('stream')
  // @HttpCode(200)
  // stream(@Body() data: number[]): Observable<number> {
  //   return this.client
  //     .send<number>('streaming.sum', data)
  //     .pipe(scan((a, b) => a + b));
  // }

  // @Post('concurrent')
  // @HttpCode(200)
  // concurrent(@Body() data: number[][]): Promise<boolean> {
  //   const send = async (tab: number[]) => {
  //     const expected = tab.reduce((a, b) => a + b);
  //     const result = await this.client
  //       .send<number>('math.sum', tab)
  //       .toPromise();

  //     return result === expected;
  //   };
  //   return data
  //     .map(async tab => await send(tab))
  //     .reduce(async (a, b) => (await a) && (await b));
  // }

  // @MessagePattern('math.*')
  // sum(data: number[]): number {
  //   return (data || []).reduce((a, b) => a + b);
  // }

  // @MessagePattern('async.*')
  // async asyncSum(data: number[]): Promise<number> {
  //   return (data || []).reduce((a, b) => a + b);
  // }

  // @MessagePattern('stream.*')
  // streamSum(data: number[]): Observable<number> {
  //   return of((data || []).reduce((a, b) => a + b));
  // }

  // @MessagePattern('streaming.*')
  // streaming(data: number[]): Observable<number> {
  //   return from(data);
  // }

  // @Get('exception')
  // async getError() {
  //   return await this.client
  //     .send<number>('exception', {})
  //     .pipe(catchError(err => of(err)));
  // }

  // @MessagePattern('exception')
  // throwError(): Observable<number> {
  //   return throwError(new RpcException('test'));
  // }

  // @Post('notify')
  // async sendNotification(): Promise<any> {
  //   return this.client.emit<number>('notification', true);
  // }

  // @EventPattern('notification')
  // eventHandler(data: boolean) {
  //   KafkaController.IS_NOTIFIED = data;
  // }
}
