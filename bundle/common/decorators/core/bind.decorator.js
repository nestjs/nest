"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Binds parameters decorators to the particular method
 * Useful when the language doesn't provide a 'Parameter Decorators' feature (vanilla JavaScript)
 * @param  {} ...decorators
 */
function Bind(...decorators) {
    return (target, key, descriptor) => {
        decorators.forEach((fn, index) => fn(target, key, index));
        return descriptor;
    };
}
exports.Bind = Bind;
