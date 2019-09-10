import { ReplaySubject, Subject } from 'rxjs';

export interface SocketEventsHost<T = any> {
  server: T;
  init: ReplaySubject<T>;
  connection: Subject<any>;
  disconnect: Subject<any>;
}
