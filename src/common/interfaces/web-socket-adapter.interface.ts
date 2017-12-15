import { Observable } from 'rxjs/Observable';

export interface WebSocketAdapter {
  create(port: number);
  createWithNamespace?(port: number, namespace: string, server?);
  bindClientConnect(server, callback: (...args) => void);
  bindClientDisconnect?(client, callback: (...args) => void);
  bindMessageHandlers(
    client,
    handler: {
      message: string;
      callback: (...args) => Observable<any> | Promise<any> | void;
    }[],
    process: (data) => Observable<any>,
  );
  bindMiddleware?(server, middleware: (socket, next) => void);
}
