import {
  WebSocketGateway,
  SubscribeMessage,
  WsResponse,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

@WebSocketGateway()
export class EventsGateway {
  @WebSocketServer() server;

  @SubscribeMessage('events')
  onEvent(client, data): Observable<WsResponse<number>> {
    const event = 'events';
    const response = [1, 2, 3];

    return from(response).pipe(map(res => ({ event, data: res })));
  }
}
