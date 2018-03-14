import {
  WebSocketGateway,
  SubscribeMessage,
  WsResponse,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/from';
import 'rxjs/add/operator/map';
import { SubscribeWsMessage } from '../common/adapters/subscribe-ws-message.decorator';

@WebSocketGateway({ port: 8090 })
export class EventsGateway {
  @WebSocketServer() server;

  @SubscribeWsMessage('events', 'channel')
  onEvent(client, data): Observable<WsResponse<number>> {
    const event = 'events';
    const response = [1, 2, 3];

    return Observable.from(response).map(res => ({ event, data: res }));
  }
}
