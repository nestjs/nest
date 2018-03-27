"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class WsException extends Error {
    constructor(error) {
        super();
        this.error = error;
        this.message = error;
    }
    getError() {
        return this.error;
    }
}
exports.WsException = WsException;
