import { ExternalExceptionsHandler } from '../exceptions/external-exceptions-handler';
import { ExecutionContextHost } from '../helpers/execution-context-host';

export class ExternalErrorProxy {
  public createProxy(
    targetCallback: (...args: any[]) => any,
    exceptionsHandler: ExternalExceptionsHandler,
  ) {
    return async (...args: any[]) => {
      try {
        return await targetCallback(...args);
      } catch (e) {
        const host = new ExecutionContextHost(args);
        return exceptionsHandler.next(e, host);
      }
    };
  }
}
