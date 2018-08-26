import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';

@WebSocketGateway(8080)
export class AckGateway {
  @SubscribeMessage('push')
  onPush() {
    return 'pong';
  }
}
