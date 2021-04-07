import { SubscribeMessage,WebSocketGateway } from '@nestjs/websockets';

@WebSocketGateway(8080, {
  namespace: 'test',
})
export class NamespaceGateway {
  @SubscribeMessage('push')
  onPush(client, data) {
    return {
      event: 'pop',
      data,
    };
  }
}
