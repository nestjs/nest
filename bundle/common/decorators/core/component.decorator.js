"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const deprecate = require("deprecate");
const uuid = require("uuid/v4");
/**
 * Defines the injectable class. This class can inject dependencies through constructor.
 * Those dependencies have to belong to the same module.
 */
function Injectable() {
    return (target) => { };
}
exports.Injectable = Injectable;
/**
 * @deprecated
 * Defines the Component. The component can inject dependencies through constructor.
 * Those dependencies have to belong to the same module.
 */
function Component() {
    deprecate('The @Component() decorator is deprecated and will be removed within next major release. Use @Injectable() instead.');
    return (target) => { };
}
exports.Component = Component;
/**
 * @deprecated
 * Defines the Pipe. The Pipe should implement the `PipeTransform` interface.
 */
function Pipe() {
    deprecate('The @Pipe() decorator is deprecated and will be removed within next major release. Use @Injectable() instead.');
    return (target) => { };
}
exports.Pipe = Pipe;
/**
 * @deprecated
 * Defines the Guard. The Guard should implement the `CanActivate` interface.
 */
function Guard() {
    deprecate('The @Guard() decorator is deprecated and will be removed within next major release. Use @Injectable() instead.');
    return (target) => { };
}
exports.Guard = Guard;
/**
 * @deprecated
 * Defines the Middleware. The Middleware should implement the `NestMiddleware` interface.
 */
function Middleware() {
    deprecate('The @Middleware() decorator is deprecated and will be removed within next major release. Use @Injectable() instead.');
    return (target) => { };
}
exports.Middleware = Middleware;
/**
 * @deprecated
 * Defines the Interceptor. The Interceptor should implement `HttpInterceptor`, `RpcInterceptor` or `WsInterceptor` interface.
 */
function Interceptor() {
    deprecate('The @Interceptor() decorator is deprecated and will be removed within next major release. Use @Injectable() instead.');
    return (target) => { };
}
exports.Interceptor = Interceptor;
function mixin(mixinClass) {
    Object.defineProperty(mixinClass, 'name', {
        value: uuid(),
    });
    Injectable()(mixinClass);
    return mixinClass;
}
exports.mixin = mixin;
