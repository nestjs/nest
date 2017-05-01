import { ExceptionsHandler } from '../exceptions/exceptions-handler';

export type RouterProxyCallback = (req?, res?, next?) => void;

export class RouterProxy {
    public createProxy(
        targetCallback: RouterProxyCallback,
        exceptionsHandler: ExceptionsHandler,
    ) {
        return (req, res, next) => {
            try {
                Promise.resolve(targetCallback(req, res, next))
                    .catch((e) => {
                        exceptionsHandler.next(e, res);
                    });
            }
            catch (e) {
                exceptionsHandler.next(e, res);
            }
        };
    }

}
