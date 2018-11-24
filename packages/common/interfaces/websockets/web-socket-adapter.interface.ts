import { Observable } from 'rxjs';

export interface WebSocketAdapter<T = any> {
  create(port: number, options?: T);
  bindClientConnect(server: any, callback: (...args: any[]) => void);
  bindClientDisconnect?(client: any, callback: (...args: any[]) => void);
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
