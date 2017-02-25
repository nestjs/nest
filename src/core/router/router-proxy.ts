import { ExceptionsHandler } from '../exceptions/exceptions-handler';

export class RouterProxy {

    constructor(private exceptionsHandler: ExceptionsHandler) {}

    createProxy(targetCallback: RouterProxyCallback) {
        return (req, res, next) => {
            try {
                Promise.resolve(targetCallback(req, res, next)).catch((e) => {
                    this.exceptionsHandler.next(e, res);
                });
            }
            catch(e) {
                this.exceptionsHandler.next(e, res);
            }
        }
    }

}

export interface RouterProxyCallback {
    (req?, res?, next?): void;
}
