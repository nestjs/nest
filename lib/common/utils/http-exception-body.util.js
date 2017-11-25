"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHttpExceptionBody = (message, error, status) => message
    ? { statusCode: status, error, message }
    : { statusCode: status, error };
