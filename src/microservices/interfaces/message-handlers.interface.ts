import {Observable} from 'rxjs/Observable';

export interface MessageHandlers {
  [pattern: string]: (data) => Promise<Observable<any>>;
}