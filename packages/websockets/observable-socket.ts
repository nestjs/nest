import { ReplaySubject, Subject } from 'rxjs';
import { ObservableSocketServer } from './interfaces/observable-socket-server.interface';

export class ObservableSocket {
  public static create<T = any>(server: T): ObservableSocketServer<T> {
    const init = new ReplaySubject<T>();
    init.next(server);

    return {
      init,
      connection: new Subject(),
      disconnect: new Subject(),
      server,
    };
  }
}
