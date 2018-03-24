import * as WebSocket from 'ws';
import { Server } from 'http';
import { MessageMappingProperties } from '../gateway-metadata-explorer';
import { CONNECTION_EVENT, DISCONNECT_EVENT, CLOSE_EVENT } from '../constants';
import { WebSocketAdapter } from '@nestjs/common';
import { Observable } from 'rxjs/Observable';
import { mergeMap, filter, tap } from 'rxjs/operators';
import { fromEvent } from 'rxjs/observable/fromEvent';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import 'rxjs/add/observable/empty';

export class WsAdapter implements WebSocketAdapter {
  constructor(private readonly httpServer: Server | null = null) {}

  public create(
    port: number,
    options?: any & { namespace?: string; server?: any },
  ): any {
    const { server, ...wsOptions } = options;
    if (port === 0 && this.httpServer) {
      return new WebSocket.Server({
        server: this.httpServer,
        ...wsOptions,
      });
    }
    return server
      ? server
      : new WebSocket.Server({
          port,
          ...wsOptions,
        });
  }

  public bindClientConnect(server, callback: (...args) => void) {
    server.on(CONNECTION_EVENT, callback);
  }

  public bindClientDisconnect(client, callback: (...args) => void) {
    client.on(CLOSE_EVENT, callback);
  }

  public bindMessageHandlers(
    client: WebSocket,
    handlers: MessageMappingProperties[],
    process: (data: any) => Observable<any>,
  ) {
    fromEvent(client, 'message')
      .pipe(
        mergeMap(data => this.bindMessageHandler(data, handlers, process)),
        filter(result => !!result),
      )
      .subscribe(response => client.send(JSON.stringify(response)));
  }

  public bindMessageHandler(
    buffer,
    handlers: MessageMappingProperties[],
    process: (data: any) => Observable<any>,
  ): Observable<any> {
    const message = JSON.parse(buffer.data);
    const messageHandler = handlers.find(
      handler => handler.message === message.event,
    );
    if (!messageHandler) {
      return Observable.empty();
    }
    const { callback } = messageHandler;
    return process(callback(message.data));
  }

  public close(server) {
    isFunction(server.close) && server.close();
  }
}
