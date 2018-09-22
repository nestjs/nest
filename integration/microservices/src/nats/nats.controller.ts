import { Body, Controller, HttpCode, Post, Query } from '@nestjs/common';
import {
  Client,
  ClientProxy,
  MessagePattern,
  Transport,
} from '@nestjs/microservices';
import { from, Observable, of } from 'rxjs';
import { scan } from 'rxjs/operators';

@Controller()
export class NatsController {
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
      .map(async tab => await send(tab))
      .reduce(async (a, b) => (await a) && (await b));
  }

  @MessagePattern('math.*')
  sum(data: number[]): number {
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
}
