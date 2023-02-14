import { Observable } from 'rxjs';

/**
 * @publicApi
 */
export interface MessageHandler<TInput = any, TContext = any, TResult = any> {
  (data: TInput, ctx?: TContext):
    | Promise<Observable<TResult>>
    | Promise<TResult>;
  next?: (
    data: TInput,
    ctx?: TContext,
  ) => Promise<Observable<TResult>> | Promise<TResult>;
  isEventHandler?: boolean;
  extras?: Record<string, any>;
}
