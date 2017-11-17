import 'rxjs/add/observable/from';
import 'rxjs/add/operator/map';

import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
  WsResponse
} from '@nestjs/websockets';
import {Observable} from 'rxjs/Observable';

@WebSocketGateway(81)
export class EventsGateway {
  @WebSocketServer() server;

  @SubscribeMessage('events')
  onEvent(client, data): Observable<WsResponse<number>> {
    const event = 'events';
    const response = [ 1, 2, 3 ];

    return Observable.from(response).map((res) => ({event, data : res}));
  }
}