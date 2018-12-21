import { ReplaySubject, Subject } from 'rxjs';
import { ObservableSocketServer } from './interfaces/observable-socket-server.interface';

export class ObservableSocket {
  public static create<T = any>(server: T): ObservableSocketServer<T> {
    const init = new ReplaySubject<T>();
    init.next(server);

    const connection = new Subject();
    const disconnect = new Subject();
    return {
      init,
      connection,
      disconnect,
      server,
    };
  }
}
