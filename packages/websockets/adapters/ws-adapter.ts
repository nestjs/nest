import { Server } from 'http';
import { MessageMappingProperties } from '../gateway-metadata-explorer';
import {
  CONNECTION_EVENT,
  DISCONNECT_EVENT,
  CLOSE_EVENT,
  ERROR_EVENT,
} from '../constants';
import { WebSocketAdapter, Logger } from '@nestjs/common';
import { Observable } from 'rxjs/Observable';
import { mergeMap, filter, tap } from 'rxjs/operators';
import { fromEvent } from 'rxjs/observable/fromEvent';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import { empty } from 'rxjs/observable/empty';
import { MissingRequiredDependencyException } from '@nestjs/core/errors/exceptions/missing-dependency.exception';

let wsPackage: any = {};

export class WsAdapter implements WebSocketAdapter {
  private readonly logger = new Logger(WsAdapter.name);
  constructor(private readonly httpServer: Server | null = null) {
    try {
      wsPackage = require('ws');
    } catch (e) {
      throw new MissingRequiredDependencyException('ws', 'WsAdapter');
    }
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
      return empty();
    }
    const { callback } = messageHandler;
    return process(callback(message.data));
  }

  public close(server) {
    isFunction(server.close) && server.close();
  }

  public bindErrorHandler(server) {
    server.on(ERROR_EVENT, err => this.logger.error(err));
    return server;
  }
}
