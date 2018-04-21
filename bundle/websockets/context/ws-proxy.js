"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const execution_context_host_1 = require("@nestjs/core/helpers/execution-context.host");
class WsProxy {
    create(targetCallback, exceptionsHandler) {
        return (...args) => __awaiter(this, void 0, void 0, function* () {
            const host = new execution_context_host_1.ExecutionContextHost(args);
            try {
                return yield targetCallback(...args);
            }
            catch (e) {
                exceptionsHandler.handle(e, host);
            }
        });
    }
}
exports.WsProxy = WsProxy;
