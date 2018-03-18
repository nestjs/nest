import { Controller, Get } from '@nestjs/common';
import {
  Client,
  MessagePattern,
  ClientProxy,
  Transport,
} from '@nestjs/microservices';
import { Observable } from 'rxjs/Observable';
import { scan, take } from 'rxjs/operators';

@Controller()
export class NatsMulticastController {
  @Client({ transport: Transport.NATS })
  client: ClientProxy;

  @Get('multicast')
  multicats() {
    return this.client
      .send<number>({ cmd: 'multicast' }, {})
      .pipe(scan((a, b) => a + b), take(2));
  }

  @MessagePattern({ cmd: 'multicast' })
  replyMulticast(): Observable<number> {
    return new Observable(observer => observer.next(1));
  }
}
