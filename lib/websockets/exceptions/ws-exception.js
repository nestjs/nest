"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class WsException {
    constructor(error) {
        this.error = error;
    }
    getError() {
        return this.error;
    }
}
exports.WsException = WsException;
