import { NextFunction, Request, Response } from 'express';

import { ExceptionsHandler } from '../exceptions/exceptions-handler';

export type RouterProxyCallback = (req?: Request, res?: Response, next?: NextFunction) => void;

export class RouterProxy {
    public createProxy(
        targetCallback: RouterProxyCallback,
        exceptionsHandler: ExceptionsHandler) {

        return (req: Request, res: Response, next: NextFunction) => {
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

    public createExceptionLayerProxy(
        targetCallback: (err: any, req: Request, res: Response, next: NextFunction) => void,
        exceptionsHandler: ExceptionsHandler) {

        return (err: any, req: Request, res: Response, next: NextFunction) => {
            try {
                Promise.resolve(targetCallback(err, req, res, next))
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
