"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RuntimeException extends Error {
    constructor(msg = ``) {
        super(msg);
        this.msg = msg;
    }
    what() {
        return this.msg;
    }
}
exports.RuntimeException = RuntimeException;
