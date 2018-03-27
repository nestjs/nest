import { Observable } from 'rxjs/Observable';
export interface WebSocketAdapter<T = any> {
  create(port: number, options?: T): any;
  bindClientConnect(server: any, callback: (...args) => void): any;
  bindClientDisconnect?(client: any, callback: (...args) => void): any;
  bindMessageHandlers(
    client: any,
    handler: {
      message: any;
      callback: (...args) => Observable<any> | Promise<any> | any;
    }[],
    process: (data) => Observable<any>,
  ): any;
  close(server: any): any;
}
