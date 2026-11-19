import { ExceptionsHandler } from '../exceptions/exceptions-handler.js';
import { ExecutionContextHost } from '../helpers/execution-context-host.js';

const noop = () => {};

export type RouterProxyCallback = <TRequest, TResponse>(
  req: TRequest,
  res: TResponse,
  next: () => void,
) => void | Promise<void>;

export class RouterProxy {
  public createProxy(
    targetCallback: RouterProxyCallback,
    exceptionsHandler: ExceptionsHandler,
  ) {
    return <TRequest, TResponse>(
      req: TRequest,
      res: TResponse,
      next: () => void,
    ) => {
      try {
        const result = targetCallback(req, res, next);
        if (
          result !== null &&
          (typeof result === 'object' || typeof result === 'function')
        ) {
          const then = (result as PromiseLike<unknown>).then;
          if (typeof then === 'function') {
            return then.call(result, noop, (e: any) => {
              const host = new ExecutionContextHost([req, res, next]);
              exceptionsHandler.next(e, host);
              return res;
            });
          }
        }
        return result;
      } catch (e) {
        const host = new ExecutionContextHost([req, res, next]);
        exceptionsHandler.next(e, host);
        return res;
      }
    };
  }

  public createExceptionLayerProxy(
    targetCallback: <TError, TRequest, TResponse>(
      err: TError,
      req: TRequest,
      res: TResponse,
      next: () => void,
    ) => void | Promise<void>,
    exceptionsHandler: ExceptionsHandler,
  ) {
    return async <TError, TRequest, TResponse>(
      err: TError,
      req: TRequest,
      res: TResponse,
      next: () => void,
    ) => {
      try {
        await targetCallback(err, req, res, next);
      } catch (e) {
        const host = new ExecutionContextHost([req, res, next]);
        exceptionsHandler.next(e, host);
        return res;
      }
    };
  }
}
