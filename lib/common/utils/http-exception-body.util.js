"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHttpExceptionBody = (message, error, statusCode) => (message ? { statusCode, error, message } : { statusCode, error });
