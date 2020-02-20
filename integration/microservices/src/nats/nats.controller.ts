import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import {
  Client,
  ClientProxy,
  Ctx,
  EventPattern,
  MessagePattern,
  NatsContext,
  Payload,
  RpcException,
  Transport,
} from '@nestjs/microservices';
import { from, Observable, of, throwError } from 'rxjs';
import { catchError, scan } from 'rxjs/operators';

@Controller()
export class NatsController {
  static IS_NOTIFIED = false;

  @Client({
    transport: Transport.NATS,
    options: {
      url: 'nats://localhost:4222',
    },
  })
  client: ClientProxy;

  @Post()
  @HttpCode(200)
  async call(
    @Query('command') cmd,
    @Body() data: number[],
  ): Promise<Observable<number>> {
    await this.client.connect();
    return this.client.send<number>(cmd, data);
  }

  @Post('stream')
  @HttpCode(200)
  stream(@Body() data: number[]): Observable<number> {
    return this.client
      .send<number>('streaming.sum', data)
      .pipe(scan((a, b) => a + b));
  }

  @Post('concurrent')
  @HttpCode(200)
  concurrent(@Body() data: number[][]): Promise<boolean> {
    const send = async (tab: number[]) => {
      const expected = tab.reduce((a, b) => a + b);
      const result = await this.client
        .send<number>('math.sum', tab)
        .toPromise();

      return result === expected;
    };
    return data
      .map(async tab => send(tab))
      .reduce(async (a, b) => (await a) && b);
  }

  @MessagePattern('math.*')
  sum(@Payload() data: number[], @Ctx() context: NatsContext): number {
    return (data || []).reduce((a, b) => a + b);
  }

  @MessagePattern('async.*')
  async asyncSum(data: number[]): Promise<number> {
    return (data || []).reduce((a, b) => a + b);
  }

  @MessagePattern('stream.*')
  streamSum(data: number[]): Observable<number> {
    return of((data || []).reduce((a, b) => a + b));
  }

  @MessagePattern('streaming.*')
  streaming(data: number[]): Observable<number> {
    return from(data);
  }

  @Get('exception')
  async getError() {
    return this.client
      .send<number>('exception', {})
      .pipe(catchError(err => of(err)));
  }

  @MessagePattern('exception')
  throwError(): Observable<number> {
    return throwError(new RpcException('test'));
  }

  @Post('notify')
  async sendNotification(): Promise<any> {
    return this.client.emit<number>('notification', true);
  }

  @EventPattern('notification')
  eventHandler(@Payload() data: boolean) {
    NatsController.IS_NOTIFIED = data;
  }
}
