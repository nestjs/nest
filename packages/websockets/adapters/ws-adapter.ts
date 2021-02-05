import { INestApplicationContext, WebSocketAdapter } from '@nestjs/common';
import { WsMessageHandler } from '@nestjs/common/interfaces';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import { NestApplication } from '@nestjs/core';
import { Observable } from 'rxjs';
import { CONNECTION_EVENT, DISCONNECT_EVENT } from '../constants';

export interface BaseWsInstance {
  on: (event: string, callback: Function) => void;
  close: Function;
}

export abstract class AbstractWsAdapter<
  TServer extends BaseWsInstance = any,
  TClient extends BaseWsInstance = any,
  TOptions = any
> implements WebSocketAdapter<TServer, TClient, TOptions> {
  protected readonly httpServer: any;

  constructor(appOrHttpServer?: INestApplicationContext | any) {
    if (appOrHttpServer && appOrHttpServer instanceof NestApplication) {
      this.httpServer = appOrHttpServer.getUnderlyingHttpServer();
    } else {
      this.httpServer = appOrHttpServer;
    }
  }

  public bindClientConnect(server: TServer, callback: Function) {
    server.on(CONNECTION_EVENT, callback);
  }

  public bindClientDisconnect(client: TClient, callback: Function) {
    client.on(DISCONNECT_EVENT, callback);
  }

  public async close(server: TServer) {
    const isCallable = server && isFunction(server.close);
    isCallable && (await new Promise(resolve => server.close(resolve)));
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async dispose() {}

  public abstract create(port: number, options?: TOptions): TServer;
  public abstract bindMessageHandlers(
    client: TClient,
    handlers: WsMessageHandler[],
    transform: (data: any) => Observable<any>,
  );
}
