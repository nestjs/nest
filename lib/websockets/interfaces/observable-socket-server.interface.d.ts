import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
export interface ObservableSocketServer {
  server: any;
  init: ReplaySubject<any>;
  connection: Subject<any>;
  disconnect: Subject<any>;
}
