import { Controller, Get } from '@nestjs/common';
import {
  Client,
  MessagePattern,
  ClientProxy,
  Transport,
} from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { scan, take } from 'rxjs/operators';

@Controller()
export class GCPubSubBroadcastController {
  @Client({
    transport: Transport.GC_PUBSUB,
    options: {
      client: {
        apiEndpoint: 'localhost:8681',
        projectId: 'microservice',
      },
    },
  })
  client: ClientProxy;

  @Get('broadcast')
  multicats() {
    return this.client.send<number>({ cmd: 'broadcast' }, {}).pipe(
      scan((a, b) => a + b),
      take(2),
    );
  }

  @MessagePattern({ cmd: 'broadcast' })
  replyBroadcast(): Observable<number> {
    return new Observable(observer => observer.next(1));
  }
}
