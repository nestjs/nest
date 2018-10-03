import { ReplaySubject, Subject } from 'rxjs';

export interface ObservableSocketServer<T = any> {
  server: T;
  init: ReplaySubject<T>;
  connection: Subject<any>;
  disconnect: Subject<any>;
}
