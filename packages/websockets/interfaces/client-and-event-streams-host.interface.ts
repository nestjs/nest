import { Observable } from 'rxjs';

export interface ClientAndEventStreamsHost<TClient = any, TRequest = any> {
  client: TClient;
  request?: TRequest;
  disconnect: Observable<TClient>;
}
