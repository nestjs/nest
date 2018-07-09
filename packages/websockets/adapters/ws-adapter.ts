import { Logger, WebSocketAdapter } from '@nestjs/common';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import { Server } from 'http';
import { EMPTY as empty, fromEvent, Observable } from 'rxjs';
import { filter, mergeMap } from 'rxjs/operators';
import { CLOSE_EVENT, CONNECTION_EVENT, ERROR_EVENT } from '../constants';
import { MessageMappingProperties } from '../gateway-metadata-explorer';

let wsPackage: any = {};

export class WsAdapter implements WebSocketAdapter {
  private readonly logger = new Logger(WsAdapter.name);
  constructor(private readonly httpServer: Server | null = null) {
    wsPackage = loadPackage('ws', 'WsAdapter');
  }

  public create(
    port: number,
    options?: any & { namespace?: string; server?: any },
  ): any {
    const { server, ...wsOptions } = options;
    if (port === 0 && this.httpServer) {
      return this.bindErrorHandler(
        new wsPackage.Server({
          server: this.httpServer,
          ...wsOptions,
        }),
      );
    }
    return server
      ? server
      : this.bindErrorHandler(
          new wsPackage.Server({
            port,
            ...wsOptions,
          }),
        );
  }

  public bindClientConnect(server, callback: (...args) => void) {
    server.on(CONNECTION_EVENT, callback);
  }

  public bindClientDisconnect(client, callback: (...args) => void) {
    client.on(CLOSE_EVENT, callback);
  }

  public bindMessageHandlers(
    client: any,
    handlers: MessageMappingProperties[],
    transform: (data: any) => Observable<any>,
  ) {
    fromEvent(client, 'message')
      .pipe(
        mergeMap(data =>
          this.bindMessageHandler(data, handlers, transform).pipe(
            filter(result => result),
          ),
        ),
      )
      .subscribe(response => client.send(JSON.stringify(response)));
  }

  public bindMessageHandler(
    buffer,
    handlers: MessageMappingProperties[],
    transform: (data: any) => Observable<any>,
  ): Observable<any> {
    try {
      const message = JSON.parse(buffer.data);
      const messageHandler = handlers.find(
        handler => handler.message === message.event,
      );
      const { callback } = messageHandler;
      return transform(callback(message.data));
    } catch {
      return empty;
    }
  }

  public close(server) {
    isFunction(server.close) && server.close();
  }

  public bindErrorHandler(server) {
    server.on(ERROR_EVENT, err => this.logger.error(err));
    return server;
  }
}
