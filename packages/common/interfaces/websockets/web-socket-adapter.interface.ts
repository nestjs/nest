import { Observable } from 'rxjs';

/**
 * @publicApi
 */
export interface WsMessageHandler<T = string> {
  message: T;
  callback: (...args: any[]) => Observable<any> | Promise<any>;
  isAckHandledManually: boolean;
}

/**
 * @publicApi
 */
export interface WebSocketAdapter<
  TServer = any,
  TClient = any,
  TOptions = any,
> {
  create(port: number, options?: TOptions): TServer;
  bindClientConnect(server: TServer, callback: Function): any;
  bindClientDisconnect?(client: TClient, callback: Function): any;
  /**
   * Drops a client that connected while the lifecycle hooks of the application
   * ("onModuleInit", "onApplicationBootstrap") were still running. Nothing was
   * bound to it, so that it is not served by providers that are not
   * initialized yet.
   */
  closeClient?(client: TClient): any;
  bindMessageHandlers(
    client: TClient,
    handlers: WsMessageHandler[],
    transform: (data: any) => Observable<any>,
  ): any;
  close(server: TServer): any;
}
