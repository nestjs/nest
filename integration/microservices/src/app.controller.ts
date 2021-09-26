import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Query,
} from '@nestjs/common';
import {
  Client,
  ClientProxy,
  EventPattern,
  MessagePattern,
  RpcException,
  Transport,
} from '@nestjs/microservices';
import { from, lastValueFrom, Observable, of, throwError } from 'rxjs';
import { catchError, scan } from 'rxjs/operators';

@Controller()
export class AppController {
  constructor(
    @Inject('USE_CLASS_CLIENT') private useClassClient: ClientProxy,
    @Inject('USE_FACTORY_CLIENT') private useFactoryClient: ClientProxy,
    @Inject('CUSTOM_PROXY_CLIENT') private customClient: ClientProxy,
  ) {}
  static IS_NOTIFIED = false;

  @Client({ transport: Transport.TCP })
  client: ClientProxy;

  @Post()
  @HttpCode(200)
  call(@Query('command') cmd, @Body() data: number[]): Observable<number> {
    return this.client.send<number>({ cmd }, data);
  }

  @Post('useFactory')
  @HttpCode(200)
  callWithClientUseFactory(
    @Query('command') cmd,
    @Body() data: number[],
  ): Observable<number> {
    return this.useFactoryClient.send<number>({ cmd }, data);
  }

  @Post('useClass')
  @HttpCode(200)
  callWithClientUseClass(
    @Query('command') cmd,
    @Body() data: number[],
  ): Observable<number> {
    return this.useClassClient.send<number>({ cmd }, data);
  }

  @Post('stream')
  @HttpCode(200)
  stream(@Body() data: number[]): Observable<number> {
    return this.client
      .send<number>({ cmd: 'streaming' }, data)
      .pipe(scan((a, b) => a + b));
  }

  @Post('concurrent')
  @HttpCode(200)
  concurrent(@Body() data: number[][]): Promise<boolean> {
    const send = async (tab: number[]) => {
      const expected = tab.reduce((a, b) => a + b);
      const result = await lastValueFrom(
        this.client.send<number>({ cmd: 'sum' }, tab),
      );

      return result === expected;
    };
    return data
      .map(async tab => send(tab))
      .reduce(async (a, b) => (await a) && b);
  }

  @Post('error')
  @HttpCode(200)
  serializeError(
    @Query('client') query: 'custom' | 'standard' = 'standard',
    @Body() body: Record<string, any>,
  ): Observable<boolean> {
    const client = query === 'custom' ? this.customClient : this.client;
    return client.send({ cmd: 'err' }, {}).pipe(
      catchError(err => {
        return of(err instanceof RpcException);
      }),
    );
  }

  @MessagePattern({ cmd: 'sum' })
  sum(data: number[]): number {
    return (data || []).reduce((a, b) => a + b);
  }

  @MessagePattern({ cmd: 'asyncSum' })
  async asyncSum(data: number[]): Promise<number> {
    return (data || []).reduce((a, b) => a + b);
  }

  @MessagePattern({ cmd: 'streamSum' })
  streamSum(data: number[]): Observable<number> {
    return of((data || []).reduce((a, b) => a + b));
  }

  @MessagePattern({ cmd: 'streaming' })
  streaming(data: number[]): Observable<number> {
    return from(data);
  }

  @MessagePattern({ cmd: 'err' })
  throwAnError() {
    return throwError(() => new Error('err'));
  }

  @Post('notify')
  async sendNotification(): Promise<any> {
    return this.client.emit<number>('notification', true);
  }

  @EventPattern('notification')
  eventHandler(data: boolean) {
    AppController.IS_NOTIFIED = data;
  }
}
