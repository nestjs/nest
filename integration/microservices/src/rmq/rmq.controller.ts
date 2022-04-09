import { Body, Controller, HttpCode, Post, Query } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
  RmqRecordBuilder,
  Transport,
} from '@nestjs/microservices';
import { from, lastValueFrom, Observable, of } from 'rxjs';
import { scan } from 'rxjs/operators';

@Controller()
export class RMQController {
  static IS_NOTIFIED = false;

  client: ClientProxy;

  constructor() {
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://localhost:5672`],
        queue: 'test',
        queueOptions: { durable: false },
        socketOptions: { noDelay: true },
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
      const result = await lastValueFrom(
        this.client.send<number>({ cmd: 'sum' }, tab),
      );

      return result === expected;
    };
    return data
      .map(async tab => send(tab))
      .reduce(async (a, b) => (await a) && b);
  }

  @Post('multiple-urls')
  @HttpCode(200)
  multipleUrls(@Body() data: number[]) {
    const clientWithMultipleUrls = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://localhost:5671`, `amqp://localhost:5672`],
        queue: 'test',
        queueOptions: { durable: false },
        socketOptions: { noDelay: true },
      },
    });
    return clientWithMultipleUrls.send<number>({ cmd: 'multiple-urls' }, data);
  }

  @Post('record-builder-duplex')
  @HttpCode(200)
  useRecordBuilderDuplex(@Body() data: Record<string, any>) {
    const record = new RmqRecordBuilder(data)
      .setOptions({
        headers: {
          ['x-version']: '1.0.0',
        },
        priority: 3,
      })
      .build();

    return this.client.send('record-builder-duplex', record);
  }

  @MessagePattern('record-builder-duplex')
  handleRecordBuilderDuplex(
    @Payload() data: Record<string, any>,
    @Ctx() context: RmqContext,
  ) {
    const originalMessage = context.getMessage();
    return {
      data,
      headers: originalMessage.properties.headers,
      priority: originalMessage.properties.priority,
    };
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

  @MessagePattern({ cmd: 'multiple-urls' })
  handleMultipleUrls(data: number[]): number {
    return (data || []).reduce((a, b) => a + b);
  }

  @Post('notify')
  async sendNotification(): Promise<any> {
    return this.client.emit<number>('notification', true);
  }

  @EventPattern('notification')
  eventHandler(data: boolean) {
    RMQController.IS_NOTIFIED = data;
  }
}
