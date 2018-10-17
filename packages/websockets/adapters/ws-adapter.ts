import {
  INestApplicationContext,
  Logger,
  WebSocketAdapter,
} from '@nestjs/common';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import { NestApplication } from '@nestjs/core';
import { Server } from 'http';
import { EMPTY as empty, fromEvent, Observable } from 'rxjs';
import { filter, first, mergeMap, share, takeUntil } from 'rxjs/operators';
import { CLOSE_EVENT, CONNECTION_EVENT, ERROR_EVENT } from '../constants';
import { MessageMappingProperties } from '../gateway-metadata-explorer';

let wsPackage: any = {};

enum READY_STATE {
  CONNECTING_STATE = 0,
  OPEN_STATE = 1,
  CLOSING_STATE = 2,
  CLOSED_STATE = 3,
}

export class WsAdapter implements WebSocketAdapter {
  protected readonly logger = new Logger(WsAdapter.name);
  protected readonly httpServer: Server;

  constructor(appOrHttpServer?: INestApplicationContext | Server) {
    wsPackage = loadPackage('ws', 'WsAdapter');
    if (appOrHttpServer && appOrHttpServer instanceof NestApplication) {
      this.httpServer = appOrHttpServer.getUnderlyingHttpServer();
    } else {
      this.httpServer = appOrHttpServer as Server;
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
    client: any,
    handlers: MessageMappingProperties[],
    transform: (data: any) => Observable<any>,
  ) {
    const close$ = fromEvent(client, CLOSE_EVENT).pipe(share(), first());
    const source$ = fromEvent(client, 'message').pipe(
      mergeMap(data =>
        this.bindMessageHandler(data, handlers, transform).pipe(
          filter(result => result),
        ),
      ),
      takeUntil(close$),
    );
    const handleMessage = response => {
      if (client.readyState !== READY_STATE.OPEN_STATE) {
        return;
      }
      client.send(JSON.stringify(response));
    };
    source$.subscribe(handleMessage);
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
    server.on(CONNECTION_EVENT, ws =>
      ws.on(ERROR_EVENT, err => this.logger.error(err)),
    );
    server.on(ERROR_EVENT, err => this.logger.error(err));
    return server;
  }
}
