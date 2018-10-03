import { Controller, Get, Post, Body, Query, HttpCode } from '@nestjs/common';
import {
  Client,
  MessagePattern,
  ClientProxy,
  Transport,
  ClientProxyFactory,
} from '@nestjs/microservices';
import { Observable, of, from } from 'rxjs';
import { scan } from 'rxjs/operators';

@Controller()
export class RMQController {
  client: ClientProxy;

  constructor() {
    this.client = ClientProxyFactory.create({
        transport: Transport.RMQ,
        options: {
          urls: [`amqp://admin:admin@localhost`],
          queue: 'test',
          queueOptions: { durable: false },
        },
      });
  }

  @Post()
  @HttpCode(200)
  call(@Query('command') cmd, @Body() data: number[]) {
    return this.client.send<number>({ cmd }, data);
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
      .map(async tab => await send(tab))
      .reduce(async (a, b) => (await a) && (await b));
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
}
