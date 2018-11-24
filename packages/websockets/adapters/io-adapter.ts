import { INestApplicationContext, WebSocketAdapter } from '@nestjs/common';
import { isFunction, isNil } from '@nestjs/common/utils/shared.utils';
import { NestApplication } from '@nestjs/core';
import { Server } from 'http';
import { fromEvent, Observable } from 'rxjs';
import { filter, first, map, mergeMap, share, takeUntil } from 'rxjs/operators';
import * as io from 'socket.io';
import { CONNECTION_EVENT, DISCONNECT_EVENT } from '../constants';
import { MessageMappingProperties } from '../gateway-metadata-explorer';
import { BaseWsExceptionFilter } from './../exceptions/base-ws-exception-filter';

export class IoAdapter implements WebSocketAdapter {
  protected readonly baseExceptionFilter = new BaseWsExceptionFilter();
  protected readonly httpServer: Server;

  constructor(appOrHttpServer?: INestApplicationContext | Server) {
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
    if (!options) {
      return this.createIOServer(port);
    }
    const { namespace, server, ...opt } = options;
    return server && isFunction(server.of)
      ? server.of(namespace)
      : namespace
        ? this.createIOServer(port, opt).of(namespace)
        : this.createIOServer(port, opt);
  }

  public createIOServer(port: number, options?: any): any {
    if (this.httpServer && port === 0) {
      return io(this.httpServer, options);
    }
    return io(port, options);
  }

  public bindClientConnect(server: any, callback: (...args: any[]) => void) {
    server.on(CONNECTION_EVENT, callback);
  }

  public bindClientDisconnect(client: any, callback: (...args: any[]) => void) {
    client.on(DISCONNECT_EVENT, callback);
  }

  public bindMessageHandlers(
    client: any,
    handlers: MessageMappingProperties[],
    transform: (data: any) => Observable<any>,
  ) {
    const disconnect$ = fromEvent(client, DISCONNECT_EVENT).pipe(
      share(),
      first(),
    );

    handlers.forEach(({ message, callback }) => {
      const source$ = fromEvent(client, message).pipe(
        mergeMap((payload: any) => {
          const { data, ack } = this.mapPayload(payload);
          return transform(callback(data)).pipe(
            filter((response: any) => !isNil(response)),
            map((response: any) => [response, ack]),
          );
        }),
        takeUntil(disconnect$),
      );
      const onMessage = ([response, ack]) => {
        if (response.event) {
          return client.emit(response.event, response.data);
        }
        isFunction(ack) && ack(response);
      };
      const onError = (err: any) =>
        this.baseExceptionFilter.handleError(client, err);
      source$.subscribe(onMessage as any, onError);
    });
  }

  public mapPayload(payload: any): { data: any; ack?: Function } {
    if (!Array.isArray(payload)) {
      return { data: payload };
    }
    const lastElement = payload[payload.length - 1];
    const isAck = isFunction(lastElement);
    if (isAck) {
      const size = payload.length - 1;
      return {
        data: size === 1 ? payload[0] : payload.slice(0, size),
        ack: lastElement,
      };
    }
    return { data: payload };
  }

  public bindMiddleware(server, middleware: (socket, next) => void) {
    server.use(middleware);
  }

  public close(server: any) {
    isFunction(server.close) && server.close();
  }
}
