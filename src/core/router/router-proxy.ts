import {ExceptionsHandler} from '../exceptions/exceptions-handler';

export type RouterProxyCallback = (req?, res?, next?) => void;

export class RouterProxy {
  public createProxy(targetCallback: RouterProxyCallback,
                     exceptionsHandler: ExceptionsHandler) {

    return (req, res, next) => {
      try {
        Promise.resolve(targetCallback(req, res, next))
            .catch((e) => { exceptionsHandler.next(e, res); });
      } catch (e) {
        exceptionsHandler.next(e, res);
      }
    };
  }

  public createExceptionLayerProxy(targetCallback: (err, req, res,
                                                    next) => void,
                                   exceptionsHandler: ExceptionsHandler) {

    return (err, req, res, next) => {
      try {
        Promise.resolve(targetCallback(err, req, res, next))
            .catch((e) => { exceptionsHandler.next(e, res); });
      } catch (e) {
        exceptionsHandler.next(e, res);
      }
    };
  }
}
