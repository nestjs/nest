import { ReplaySubject, Subject } from 'rxjs';

export interface ServerAndEventStreamsHost<T = any> {
  server: T;
  init: ReplaySubject<T>;
  connection: Subject<any>;
  disconnect: Subject<any>;
}
