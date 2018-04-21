"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const execution_context_host_1 = require("../helpers/execution-context.host");
class RouterProxy {
    createProxy(targetCallback, exceptionsHandler) {
        return (req, res, next) => {
            const host = new execution_context_host_1.ExecutionContextHost([req, res]);
            try {
                Promise.resolve(targetCallback(req, res, next)).catch(e => {
                    exceptionsHandler.next(e, host);
                });
            }
            catch (e) {
                exceptionsHandler.next(e, host);
            }
        };
    }
    createExceptionLayerProxy(targetCallback, exceptionsHandler) {
        return (err, req, res, next) => {
            const host = new execution_context_host_1.ExecutionContextHost([req, res]);
            try {
                Promise.resolve(targetCallback(err, req, res, next)).catch(e => {
                    exceptionsHandler.next(e, host);
                });
            }
            catch (e) {
                exceptionsHandler.next(e, host);
            }
        };
    }
}
exports.RouterProxy = RouterProxy;
