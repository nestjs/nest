"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_exception_1 = require("@nestjs/core/errors/exceptions/runtime.exception");
class InvalidDecoratorItemException extends runtime_exception_1.RuntimeException {
    constructor(decorator, item, context) {
        super(`Invalid ${item} passed to ${decorator}() decorator (${context}).`);
    }
}
exports.InvalidDecoratorItemException = InvalidDecoratorItemException;
function validateEach(context, arr, predicate, decorator, item) {
    if (!context || !context.name) {
        return true;
    }
    const errors = arr.filter(str => !predicate(str));
    if (errors.length > 0) {
        throw new InvalidDecoratorItemException(decorator, item, context.name);
    }
    return true;
}
exports.validateEach = validateEach;
