import { UseInterceptors } from '@nestjs/common';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { RequestInterceptor } from './request.interceptor';

@WebSocketGateway(8080)
export class ApplicationGateway {
  @SubscribeMessage('push')
  onPush(@MessageBody() data) {
    return {
      event: 'pop',
      data,
    };
  }

  @UseInterceptors(RequestInterceptor)
  @SubscribeMessage('getClient')
  getPathCalled(client, data) {
    return {
      event: 'popClient',
      data: { ...data, path: client.pattern },
    };
  }
}
