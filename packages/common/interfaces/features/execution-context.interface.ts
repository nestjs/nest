import { Type } from '../index';
import { ArgumentsHost, ContextType } from './arguments-host.interface';

export interface ExecutionContext<TContext extends ContextType = ContextType>
  extends ArgumentsHost<TContext> {
  getClass<T = any>(): Type<T>;
  getHandler(): Function;
}
