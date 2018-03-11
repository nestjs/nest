import { Observable } from 'rxjs/Observable';
export interface WebSocketAdapter {
  create(port: number): any;
  createWithNamespace?(port: number, namespace: string, server?: any): any;
  bindClientConnect(server: any, callback: (...args) => void): any;
  bindClientDisconnect?(client: any, callback: (...args) => void): any;
  bindMessageHandlers(
    client: any,
    handler: {
      message: string;
      callback: (...args) => Observable<any> | Promise<any> | void;
    }[],
    process: (data) => Observable<any>,
  ): any;
  bindMiddleware?(server: any, middleware: (socket, next) => void): any;
}
