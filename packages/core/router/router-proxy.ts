import { ExceptionsHandler } from '../exceptions/exceptions-handler';
import { ExecutionContextHost } from '../helpers/execution-context.host';

export type RouterProxyCallback = (req?, res?, next?) => void;

export class RouterProxy {
  public createProxy(
    targetCallback: RouterProxyCallback,
    exceptionsHandler: ExceptionsHandler,
  ) {
    return (req, res, next) => {
      const host = new ExecutionContextHost([req, res]);
      try {
        Promise.resolve(targetCallback(req, res, next)).catch(e => {
          exceptionsHandler.next(e, host);
        });
      } catch (e) {
        exceptionsHandler.next(e, host);
      }
    };
  }

  public createExceptionLayerProxy(
    targetCallback: (err, req, res, next) => void,
    exceptionsHandler: ExceptionsHandler,
  ) {
    return (err, req, res, next) => {
      const host = new ExecutionContextHost([req, res]);
      try {
        Promise.resolve(targetCallback(err, req, res, next)).catch(e => {
          exceptionsHandler.next(e, host);
        });
      } catch (e) {
        exceptionsHandler.next(e, host);
      }
    };
  }
}
