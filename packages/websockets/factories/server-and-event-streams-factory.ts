import { ReplaySubject, Subject } from 'rxjs';
import { ServerAndEventStreamsHost } from '../interfaces/server-and-event-streams-host.interface';

export class ServerAndEventStreamsFactory {
  public static create<T = any>(server: T): ServerAndEventStreamsHost<T> {
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
