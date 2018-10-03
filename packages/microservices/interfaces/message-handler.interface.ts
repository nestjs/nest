import { Observable } from 'rxjs';

export type MessageHandler<TInput = any, TResult = any> = (
  data: TInput,
) => Promise<Observable<TResult>>;
