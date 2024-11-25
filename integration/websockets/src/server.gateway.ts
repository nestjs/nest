import { OnApplicationShutdown, UseInterceptors } from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import * as Sinon from 'sinon';
import { RequestInterceptor } from './request.interceptor';

@WebSocketGateway()
export class ServerGateway implements OnApplicationShutdown {
  @SubscribeMessage('push')
  onPush(client, data) {
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

  onApplicationShutdown = Sinon.spy();
}
