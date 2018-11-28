import { Observable } from 'rxjs';

export interface MessageHandlers {
  [pattern: string]: (data: any) => Promise<Observable<any>>;
}
