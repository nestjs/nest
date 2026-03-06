import {
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';
import { throwError } from 'rxjs';

@WebSocketGateway(8085)
export class WsErrorGateway {
  @SubscribeMessage('push')
  onPush() {
    return throwError(() => new WsException('test'));
  }
}
