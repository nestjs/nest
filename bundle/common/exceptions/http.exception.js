"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class HttpException extends Error {
    /**
     * The base Nest Application exception, which is handled by the default Exceptions Handler.
     * If you throw an exception from your HTTP route handlers, Nest will map them to the appropriate HTTP response and send to the client.
     *
     * When `response` is an object:
     * - object will be stringified and returned to the user as a JSON response,
     *
     * When `response` is a string:
     * - Nest will create a response with two properties:
     * ```
     * message: response,
     * statusCode: X
     * ```
     */
    constructor(response, status) {
        super();
        this.response = response;
        this.status = status;
        this.message = response;
    }
    getResponse() {
        return this.response;
    }
    getStatus() {
        return this.status;
    }
}
exports.HttpException = HttpException;
