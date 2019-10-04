import { Observable } from 'rxjs';

export interface MessageHandler<TInput = any, TContext = any, TResult = any> {
  (data: TInput, ctx?: TContext): Promise<Observable<TResult>>;
  isEventHandler?: boolean;
}
