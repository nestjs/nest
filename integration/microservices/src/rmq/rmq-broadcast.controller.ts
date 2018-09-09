import { Controller, Get } from '@nestjs/common';
import {
  Client,
  MessagePattern,
  ClientProxy,
  Transport,
  ClientProxyFactory,
} from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { scan, take } from 'rxjs/operators';

@Controller()
export class RMQBroadcastController {
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

  @Get('broadcast')
  multicats() {
    return this.client
      .send<number>({ cmd: 'broadcast' }, {})
      .pipe(scan((a, b) => a + b), take(2));
  }

  @MessagePattern({ cmd: 'broadcast' })
  replyBroadcast(): Observable<number> {
    return new Observable(observer => observer.next(1));
  }
}
