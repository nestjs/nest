import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';

@WebSocketGateway(8090)
export class CoreGateway {
  @SubscribeMessage('push')
  onPush(@ConnectedSocket() client, @MessageBody() data) {
    return {
      event: 'pop',
      data,
    };
  }
}
