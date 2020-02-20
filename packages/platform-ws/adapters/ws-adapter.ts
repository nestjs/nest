import { INestApplicationContext, Logger } from '@nestjs/common';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { AbstractWsAdapter } from '@nestjs/websockets';
import {
  CLOSE_EVENT,
  CONNECTION_EVENT,
  ERROR_EVENT,
} from '@nestjs/websockets/constants';
import { MessageMappingProperties } from '@nestjs/websockets/gateway-metadata-explorer';
import { EMPTY as empty, fromEvent, Observable } from 'rxjs';
import { filter, first, mergeMap, share, takeUntil } from 'rxjs/operators';

let wsPackage: any = {};

enum READY_STATE {
  CONNECTING_STATE = 0,
  OPEN_STATE = 1,
  CLOSING_STATE = 2,
  CLOSED_STATE = 3,
}

export class WsAdapter extends AbstractWsAdapter {
  protected readonly logger = new Logger(WsAdapter.name);

  constructor(appOrHttpServer?: INestApplicationContext | any) {
    super(appOrHttpServer);
    wsPackage = loadPackage('ws', 'WsAdapter', () => require('ws'));
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
    const onMessage = (response: any) => {
      if (client.readyState !== READY_STATE.OPEN_STATE) {
        return;
      }
      client.send(JSON.stringify(response));
    };
    source$.subscribe(onMessage);
  }

  public bindMessageHandler(
    buffer: any,
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

  public bindErrorHandler(server: any) {
    server.on(CONNECTION_EVENT, ws =>
      ws.on(ERROR_EVENT, (err: any) => this.logger.error(err)),
    );
    server.on(ERROR_EVENT, (err: any) => this.logger.error(err));
    return server;
  }

  public bindClientDisconnect(client: any, callback: Function) {
    client.on(CLOSE_EVENT, callback);
  }
}
