import { UseFilters, UseInterceptors } from '@nestjs/common';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';
import { RequestInterceptor } from './request.interceptor';
import { throwError } from 'rxjs';
import { RequestFilter } from './request.filter';

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

  @UseFilters(RequestFilter)
  @SubscribeMessage('getClientWithError')
  getPathCalledWithError() {
    return throwError(() => new WsException('This is an error'));
  }
}
