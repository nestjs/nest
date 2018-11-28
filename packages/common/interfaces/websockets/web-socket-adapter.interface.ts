import { Observable } from 'rxjs';

export interface WebSocketAdapter<T = any> {
  create(port: number, options?: T): any;
  bindClientConnect(server: any, callback: (...args: any[]) => void): any;
  bindClientDisconnect?(client: any, callback: (...args: any[]) => void): any;
  bindMessageHandlers(
    client: any,
    handlers: Array<{
      message: any;
      callback: (...args: any[]) => Observable<any> | Promise<any> | any;
    }>,
    transform: (data: any) => Observable<any>,
  ): any;
  close(server: any): any;
}
