import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { RenderInterceptorExecutionContext as RenderInterceptorExecutionContextInterface } from '@nestjs/common/interfaces/features/render-interceptor_execution_context.interface';
import { ExecutionContextHost } from '../helpers/execution-context-host';

class RenderInterceptorExecutionContext
  implements RenderInterceptorExecutionContextInterface {
  private readonly httpArgumentsHost: HttpArgumentsHost;
  constructor(private readonly executionContext: ExecutionContextHost) {
    this.httpArgumentsHost = executionContext.switchToHttp();
  }
  getClass<T = any>() {
    return this.executionContext.getClass();
  }
  getHandler() {
    return this.executionContext.getHandler();
  }
  getRequest<T = any>() {
    return this.httpArgumentsHost.getRequest<T>();
  }
  getResponse<T = any>() {
    return this.httpArgumentsHost.getResponse<T>();
  }
}
export type RenderInterceptorExecutionContextFactory = (
  executionContext: ExecutionContextHost,
) => RenderInterceptorExecutionContext;
function executionContextFactory(executionContext: ExecutionContextHost) {
  return new RenderInterceptorExecutionContext(executionContext);
}
export const renderInterceptorExecutionContextFactory: RenderInterceptorExecutionContextFactory = executionContextFactory;
