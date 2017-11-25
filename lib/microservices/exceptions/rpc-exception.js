"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RpcException {
    constructor(error) {
        this.error = error;
    }
    getError() {
        return this.error;
    }
}
exports.RpcException = RpcException;
