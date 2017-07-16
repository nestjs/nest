"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class HttpException {
    constructor(response, status) {
        this.response = response;
        this.status = status;
    }
    getResponse() {
        return this.response;
    }
    getStatus() {
        return this.status;
    }
}
exports.HttpException = HttpException;
//# sourceMappingURL=http-exception.js.map