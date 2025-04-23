import { Controller, Get } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Ctx,
  MessagePattern,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Controller()
export class RMQTopicExchangeController {
  client: ClientProxy;

  constructor() {
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://localhost:5672`],
        queue: 'test2',
        wildcards: true,
      },
    });
  }

  @Get('topic-exchange')
  async topicExchange() {
    return lastValueFrom(this.client.send<string>('wildcard.a.b', 1));
  }

  @MessagePattern('wildcard.*.*')
  handleTopicExchange(@Ctx() ctx: RmqContext): string {
    return ctx.getPattern();
  }
}
