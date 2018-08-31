import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
} from '@nestjs/websockets';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@WebSocketGateway()
export class EventsGateway {
  @WebSocketServer() server;

  @SubscribeMessage('events')
  findAll(client, data): Observable<WsResponse<number>> {
    return from([1, 2, 3]).pipe(map(item => ({ event: 'events', data: item })));
  }

  @SubscribeMessage('identity')
  async identity(client, data: number): Promise<number> {
    return data;
  }
}
