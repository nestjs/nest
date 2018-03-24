"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RpcException extends Error {
    constructor(error) {
        super();
        this.error = error;
        this.message = error;
    }
    getError() {
        return this.error;
    }
}
exports.RpcException = RpcException;
