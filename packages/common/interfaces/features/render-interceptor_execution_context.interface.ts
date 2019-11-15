import { ExecutionContext } from './execution-context.interface';
import { HttpArgumentsHost } from './arguments-host.interface';
export interface RenderInterceptorExecutionContext {
  getClass<T = any>(): ReturnType<ExecutionContext['getClass']>;
  getHandler(): ReturnType<ExecutionContext['getHandler']>;
  getRequest<T = any>(): ReturnType<HttpArgumentsHost['getRequest']>;
  getResponse<T = any>(): ReturnType<HttpArgumentsHost['getResponse']>;
}
