import { Observable } from 'rxjs';

export interface GenericMessageHandler<TInput = any, TResult = any> {
  (data: TInput): Promise<Observable<TResult>>;
  isEventHandler?: boolean;
}

export interface NatsMessageHandler<TInput = any, TResult = any> {
  (data: TInput, pattern?: string): Promise<Observable<TResult>>;
  isEventHandler?: boolean;
}

export type MessageHandler = GenericMessageHandler | NatsMessageHandler;