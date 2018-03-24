import { Observable } from 'rxjs/Observable';

export interface WebSocketAdapter<T = any> {
  create(port: number, options?: T);
  bindClientConnect(server, callback: (...args) => void);
  bindClientDisconnect?(client, callback: (...args) => void);
  bindMessageHandlers(
    client,
    handler: {
      message: any;
      callback: (...args) => Observable<any> | Promise<any> | any;
    }[],
    process: (data) => Observable<any>,
  );
}
