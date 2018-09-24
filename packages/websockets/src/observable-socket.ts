import { Subject, ReplaySubject } from 'rxjs';
import { ObservableSocketServer } from './interfaces/observable-socket-server.interface';

export class ObservableSocket {
  public static create(server): ObservableSocketServer {
    const init = new ReplaySubject();
    init.next(server);

    return {
      init,
      connection: new Subject(),
      disconnect: new Subject(),
      server,
    };
  }
}
