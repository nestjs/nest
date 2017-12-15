import { Observable } from 'rxjs/Observable';

export interface WebSocketAdapter {
  create(port: number): any;
  createWithNamespace?(port: number, namespace: string, server?: any): any;
  bindClientConnect(server: any, callback: (...args: any[]) => void): any;
  bindClientDisconnect?(client: any, callback: (...args: any[]) => void): any;
  bindMessageHandlers(
    client: any,
    handler: {
      message: string;
      callback: (...args: any[]) => Observable<any> | Promise<any> | void;
    }[],
    process: (data: any) => Observable<any>,
  ): any;
  bindMiddleware?(server: any, middleware: (socket: any, next: any) => void): any;
}
