import { Controller, Get } from '@nestjs/common';
import {
  Client,
  ClientProxy,
  MessagePattern,
  Transport,
} from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { scan, take } from 'rxjs/operators';

@Controller()
export class StanBroadcastController {
  @Client({ transport: Transport.STAN })
  client: ClientProxy;

  @Get('broadcast')
  multicats() {
    return this.client.send<number>('broadcast.test', {}).pipe(
      scan((a, b) => a + b),
      take(2),
    );
  }

  @MessagePattern('broadcast.*')
  replyBroadcast(): Observable<number> {
    return new Observable(observer => observer.next(1));
  }
}
