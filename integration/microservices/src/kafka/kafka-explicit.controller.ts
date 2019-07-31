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
} from '@nestjs/microservices';
import { from, Observable, of, throwError } from 'rxjs';
import { catchError, scan, delay } from 'rxjs/operators';

@Controller()
export class KafkaController {
  static IS_NOTIFIED = false;

  private consumer: any = 'hel[pp me!';

  // @KafkaConsumer({
  //   topic: 'test.two'
  // })
  // public producer;

  // @Client({
  //   transport: Transport.KAFKA,
  //   options: {
  //     client: {
  //       brokers: ['localhost:9092'],
  //     },
  //   },
  // })
  // client: ClientProxy;

  @Post()
  @HttpCode(200)
  async call(
    @Query('command') cmd,
    @Body() data: number[],
  ): Promise<Observable<number>> {
    // await this.client.connect();
    // return this.client.send<number>(cmd, data);

    return from(Promise.resolve(15)).pipe(delay(500000));
  }

  @MessagePattern('test.one')
  testOne(data: any){
    Logger.error(util.format('testOne() data %o', data));

    return from(Promise.resolve(15)).pipe(delay(5000));
    // throw new Error('test');
  }

  @MessagePattern(this.consumer)
  testTo(data: any){
    Logger.error(util.format('testOne() data %o', data));

    return from(Promise.resolve(15)).pipe(delay(5000));
    // throw new Error('test');
  }
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
