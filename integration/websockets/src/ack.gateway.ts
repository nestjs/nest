import {
  Ack,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';

@WebSocketGateway(8080)
export class AckGateway {
  @SubscribeMessage('push')
  onPush() {
    return 'pong';
  }

  @SubscribeMessage('manual-ack')
  async handleManualAck(
    @MessageBody() data: any,
    @Ack() ack: (response: any) => void,
  ) {
    await new Promise(resolve => setTimeout(resolve, 20));

    if (data.shouldSucceed) {
      ack({ status: 'success', data });
    } else {
      ack({ status: 'error', message: 'Operation failed' });
    }
    return { status: 'ignored' };
  }
}
