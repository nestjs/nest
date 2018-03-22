import { Observable } from 'rxjs/Observable';

export interface WebSocketAdapter {
  create(port: number, options?: any & { namespace?: string; server?: any });
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
