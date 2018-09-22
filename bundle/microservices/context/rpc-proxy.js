"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const execution_context_host_1 = require("@nestjs/core/helpers/execution-context.host");
class RpcProxy {
    create(targetCallback, exceptionsHandler) {
        return async (...args) => {
            try {
                return await targetCallback(...args);
            }
            catch (e) {
                const host = new execution_context_host_1.ExecutionContextHost(args);
                return exceptionsHandler.handle(e, host);
            }
        };
    }
}
exports.RpcProxy = RpcProxy;
