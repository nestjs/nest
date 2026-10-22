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

  @SubscribeMessage('push-error')
  onPushError() {
    // Shaped like an HTTP client error, whose config holds the request headers
    const error = Object.assign(new Error('Request failed'), {
      config: { headers: { Authorization: 'Bearer secret' } },
    });
    throw new WsException(error);
  }
}
