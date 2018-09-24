import { Observable } from 'rxjs';

export interface WebSocketAdapter<T = any> {
  create(port: number, options?: T);
  bindClientConnect(server: any, callback: (...args) => void);
  bindClientDisconnect?(client: any, callback: (...args) => void);
  bindMessageHandlers(
    client: any,
    handlers: Array<{
      message: any;
      callback: (...args: any[]) => Observable<any> | Promise<any> | any;
    }>,
    transform: (data: any) => Observable<any>,
  );
  close(server: any);
}
