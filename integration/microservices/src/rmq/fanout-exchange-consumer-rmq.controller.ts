import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, RmqContext } from '@nestjs/microservices';

@Controller()
export class RMQFanoutExchangeConsumerController {
  constructor() {}

  @MessagePattern('ping')
  handleTopicExchange(@Ctx() ctx: RmqContext): string {
    return ctx.getPattern() + '/pong';
  }
}
