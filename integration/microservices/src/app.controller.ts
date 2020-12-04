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
import { from, Observable, of } from 'rxjs';
import { scan } from 'rxjs/operators';

@Controller()
export class AppController {
  constructor(
    @Inject('USE_CLASS_CLIENT') private useClassClient: ClientProxy,
    @Inject('USE_FACTORY_CLIENT') private useFactoryClient: ClientProxy,
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
      const result = await this.client
        .send<number>({ cmd: 'sum' }, tab)
        .toPromise();

      return result === expected;
    };
    return data
      .map(async tab => send(tab))
      .reduce(async (a, b) => (await a) && b);
  }

  @MessagePattern({ cmd: 'sum' })
  sum(data: number[]): number {
    return (data || []).reduce((a, b) => a + b);
  }

  @MessagePattern({ cmd: 'exception' })
  exception(data: unknown): never {
    throw new RpcException({ data });
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

  @Post('notify')
  async sendNotification(): Promise<any> {
    return this.client.emit<number>('notification', true);
  }

  @EventPattern('notification')
  eventHandler(data: boolean) {
    AppController.IS_NOTIFIED = data;
  }
}
