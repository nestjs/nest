import {
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';
import { throwError } from 'rxjs';

@WebSocketGateway(8080)
export class ErrorGateway {
  @SubscribeMessage('push')
  onPush() {
    return throwError(() => new WsException('test'));
  }
}
