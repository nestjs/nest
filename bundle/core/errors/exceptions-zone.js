"use strict";
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
    static async asyncRun(fn) {
        try {
            await fn();
        }
        catch (e) {
            this.exceptionHandler.handle(e);
            throw messages_1.UNHANDLED_RUNTIME_EXCEPTION;
        }
    }
}
ExceptionsZone.exceptionHandler = new exception_handler_1.ExceptionHandler();
exports.ExceptionsZone = ExceptionsZone;
