"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const execution_context_host_1 = require("@nestjs/core/helpers/execution-context.host");
class WsProxy {
    create(targetCallback, exceptionsHandler) {
        return async (...args) => {
            const host = new execution_context_host_1.ExecutionContextHost(args);
            try {
                return await targetCallback(...args);
            }
            catch (e) {
                exceptionsHandler.handle(e, host);
            }
        };
    }
}
exports.WsProxy = WsProxy;
