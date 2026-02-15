import { Controller, Get } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Controller()
export class RMQFanoutExchangeProducerController {
  client: ClientProxy;

  constructor() {
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://localhost:5672`],
        exchange: 'test.fanout',
        exchangeType: 'fanout',
      },
    });
  }

  @Get('fanout-exchange')
  async topicExchange() {
    return lastValueFrom(this.client.send<string>('ping', 1));
  }
}
