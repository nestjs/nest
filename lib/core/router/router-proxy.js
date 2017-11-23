"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RouterProxy {
    createProxy(targetCallback, exceptionsHandler) {
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
    createExceptionLayerProxy(targetCallback, exceptionsHandler) {
        return (err, req, res, next) => {
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
exports.RouterProxy = RouterProxy;
