import { Controller, Post, HttpCode, Query, Body } from "@nestjs/common";
import { ClientRMQ, MessagePattern, EventPattern } from "@nestjs/microservices";
import { customTransportAdapter } from './custom-transport-adapter'

@Controller()
export class RMQCustomTransportAdapterController {
  private client: ClientRMQ;
  static greetingsSent = 0;

  constructor() {
    this.client = new ClientRMQ({
      urls: [`amqp://localhost:5672`],
      queue: 'custom-transport-test',
      queueOptions: { durable: false },
      socketOptions: { noDelay: true },
      transportAdapter: customTransportAdapter
    })
  }

  @Post()
  @HttpCode(200)
  call(@Query('command') cmd: string, @Body() data: {}) {
    return this.client.send({ cmd }, data);
  }

  @MessagePattern({ cmd: 'greet' })
  greet(data: { recipient: string }) {
    return { message: `Hello ${data.recipient}!` };
  }

  @Post(`greeting`)
  @HttpCode(201)
  emitGreetingSent() {
    return this.client.emit('greeting_sent', {
      data: {
        message: 'greeting_sent event happened'
      }
    });
  }

  @EventPattern('greeting_sent')
  handleGreetingSent() {
    RMQCustomTransportAdapterController.greetingsSent += 1;
    return { greetingsCount: RMQCustomTransportAdapterController.greetingsSent };
  }
}
