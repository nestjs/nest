import { ReplaySubject, Subject } from 'rxjs';
import { SocketEventsHost } from './interfaces/socket-events-host.interface';

export class SocketEventsHostFactory {
  public static create<T = any>(server: T): SocketEventsHost<T> {
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
