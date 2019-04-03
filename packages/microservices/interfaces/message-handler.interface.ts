import { Observable } from 'rxjs';

export interface MessageHandler<TInput = any, TResult = any> {
  (data: TInput): Promise<Observable<TResult>>;
  isEventHandler?: boolean;
}
