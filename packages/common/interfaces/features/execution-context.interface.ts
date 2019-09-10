import { Type } from '../index';
import { ArgumentsHost, ContextType } from './arguments-host.interface';

/**
 * Interface describing details about the current request pipeline.
 *
 * @see [Execution Context](https://docs.nestjs.com/guards#execution-context)
 *
 * @publicApi
 */
export interface ExecutionContext<TContext extends ContextType = ContextType>
  extends ArgumentsHost<TContext> {
  /**
   * Returns the *type* of the controller class which the current handler belongs to.
   */
  getClass<T = any>(): Type<T>;
  /**
   * Returns a reference to the handler (method) that will be invoked next in the
   * request pipeline.
   */
  getHandler(): Function;
}
