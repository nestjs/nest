import { Body, Controller, HttpCode, Post, Query } from '@nestjs/common';
import {
  Client,
  ClientProxy,
  EventPattern,
  MessagePattern,
  Transport,
} from '@nestjs/microservices';
import { from, Observable, of } from 'rxjs';
import { scan } from 'rxjs/operators';

@Controller()
export class MqttController {
  static IS_NOTIFIED = false;
  static IS_WILDCARD_EVENT_RECEIVED = false;
  static IS_WILDCARD2_EVENT_RECEIVED = false;

  @Client({ transport: Transport.MQTT })
  client: ClientProxy;

  @Post()
  @HttpCode(200)
  async call(
    @Query('command') cmd,
    @Body() data: number[],
  ): Promise<Observable<number>> {
    await this.client.connect();
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
  async concurrent(@Body() data: number[][]): Promise<boolean> {
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

  @Post('notify')
  async sendNotification(): Promise<any> {
    return this.client.emit<number>('notification', true);
  }

  @Post('wildcard-event')
  async sendWildcardEvent(): Promise<any> {
    return this.client.emit<number>('wildcard-event/test', true);
  }

  @Post('wildcard-message')
  async sendWildcardMessage(
    @Body() data: number[],
  ): Promise<Observable<number>> {
    await this.client.connect();
    return this.client.send<number>('wildcard-message/test', data);
  }

  @Post('wildcard-event2')
  async sendWildcardEvent2(): Promise<any> {
    return this.client.emit<number>('wildcard-event2/test/test', true);
  }

  @Post('wildcard-message2')
  async sendWildcardMessage2(
    @Body() data: number[],
  ): Promise<Observable<number>> {
    await this.client.connect();
    return this.client.send<number>('wildcard-message2/test/test', data);
  }

  @MessagePattern('wildcard-message/#')
  wildcardMessageHandler(data: number[]): number {
    if ((data as any).response) {
      return;
    }
    return (data || []).reduce((a, b) => a + b);
  }

  @EventPattern('wildcard-event/#')
  wildcardEventHandler(data: boolean) {
    MqttController.IS_WILDCARD_EVENT_RECEIVED = data;
  }

  @MessagePattern('wildcard-message2/+/test')
  wildcardMessageHandler2(data: number[]): number {
    return (data || []).reduce((a, b) => a + b);
  }

  @EventPattern('wildcard-event2/+/test')
  wildcardEventHandler2(data: boolean) {
    MqttController.IS_WILDCARD2_EVENT_RECEIVED = data;
  }

  @EventPattern('notification')
  eventHandler(data: boolean) {
    MqttController.IS_NOTIFIED = data;
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
