import type { INestApplicationContext, WebSocketAdapter } from '@nestjs/common';
import { NestApplication, NestApplicationContext } from '@nestjs/core';
import { Observable } from 'rxjs';
import { CONNECTION_EVENT, DISCONNECT_EVENT } from '../constants.js';
import type { WsMessageHandler } from '@nestjs/common';
import { isFunction } from '@nestjs/common/internal';

export interface BaseWsInstance {
  on: (event: string, callback: Function) => void;
  close: Function;
}

export abstract class AbstractWsAdapter<
  TServer extends BaseWsInstance = any,
  TClient extends BaseWsInstance = any,
  TOptions = any,
> implements WebSocketAdapter<TServer, TClient, TOptions> {
  protected readonly httpServer: any;
  private _forceCloseConnections: boolean;

  public set forceCloseConnections(value: boolean) {
    this._forceCloseConnections = value;
  }

  public get forceCloseConnections(): boolean {
    return this._forceCloseConnections;
  }

  constructor(appOrHttpServer?: INestApplicationContext | object) {
    if (appOrHttpServer && appOrHttpServer instanceof NestApplication) {
      this.httpServer = appOrHttpServer.getUnderlyingHttpServer();
    } else if (appOrHttpServer instanceof NestApplicationContext) {
      // An application without an HTTP server, e.g. a standalone microservice
      this.httpServer = undefined;
    } else {
      this.httpServer = appOrHttpServer;
    }
  }

  public bindClientConnect(server: TServer, callback: Function) {
    server.on(CONNECTION_EVENT, callback);
  }

  public bindClientDisconnect(client: TClient, callback: Function) {
    if (typeof (client as any).once === 'function') {
      (client as any).once(DISCONNECT_EVENT, callback);
      return;
    }
    client.on(DISCONNECT_EVENT, callback);
  }

  /**
   * Drops a client that connected while the lifecycle hooks of the application
   * ("onModuleInit", "onApplicationBootstrap") were still running. Neither the
   * connection hook of the gateway nor its message handlers were bound to this
   * client, so it is expected to connect again.
   */
  public closeClient(client: TClient) {
    const target = client as any;
    if (isFunction(target.terminate)) {
      // ws: there is no closing handshake to wait for
      target.terminate();
    } else if (isFunction(target.conn?.close)) {
      // socket.io: closing the underlying connection, unlike "disconnect()",
      // lets the client reconnect by itself
      target.conn.close();
    } else if (isFunction(target.close)) {
      target.close();
    }
  }

  public async close(server: TServer) {
    const isCallable = server && isFunction(server.close);
    isCallable && (await new Promise(resolve => server.close(resolve)));
  }

  public async dispose() {}

  public abstract create(port: number, options?: TOptions): TServer;

  /**
   * Creates the server of a gateway without a port in an application without
   * an HTTP server to serve it on, such as a standalone microservice. The
   * server does not listen for clients, but it can still be used, e.g. to
   * broadcast through an adapter shared with other processes. Without this
   * method, `create(0, options)` is called instead.
   */
  public createWithoutListener?(options?: TOptions): TServer;
  public abstract bindMessageHandlers(
    client: TClient,
    handlers: WsMessageHandler[],
    transform: (data: any) => Observable<any>,
  );
}
