import { Subject, ReplaySubject } from 'rxjs';
import { ObservableSocketServer } from './interfaces/observable-socket-server.interface';

export class ObservableSocket {
  public static create(server): ObservableSocketServer {
    return {
      init: new ReplaySubject(),
      connection: new Subject(),
      disconnect: new Subject(),
      server,
    };
  }
}
