import { Observable } from 'rxjs';
import { ClientAndEventStreamsHost } from './client-and-event-streams-host.interface';

export interface ServerAndEventStreamsHost<T = any> {
  server: T;
  init: Observable<T>;
  connection: Observable<ClientAndEventStreamsHost<T>>;
}
