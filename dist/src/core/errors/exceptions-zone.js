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
const exception_handler_1 = require("./exception-handler");
const messages_1 = require("./messages");
class ExceptionsZone {
    static run(fn) {
        try {
            fn();
        }
        catch (e) {
            this.exceptionHandler.handle(e);
            throw messages_1.UNHANDLED_RUNTIME_EXCEPTION;
        }
    }
    static asyncRun(fn) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield fn();
            }
            catch (e) {
                this.exceptionHandler.handle(e);
                throw messages_1.UNHANDLED_RUNTIME_EXCEPTION;
            }
        });
    }
}
ExceptionsZone.exceptionHandler = new exception_handler_1.ExceptionHandler();
exports.ExceptionsZone = ExceptionsZone;
//# sourceMappingURL=exceptions-zone.js.map