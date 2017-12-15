"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Defines the Component. The component can inject dependencies through constructor.
 * Those dependencies should belongs to the same module.
 */
function Component() {
    return (target) => { };
}
exports.Component = Component;
/**
 * Defines the Pipe. The Pipe should implements the `PipeTransform` interface.
 */
function Pipe() {
    return (target) => { };
}
exports.Pipe = Pipe;
/**
 * Defines the Guard. The Guard should implement the `CanActivate` interface.
 */
function Guard() {
    return (target) => { };
}
exports.Guard = Guard;
/**
 * Defines the Middleware. The Middleware should implement the `NestMiddleware` interface.
 */
function Middleware() {
    return (target) => { };
}
exports.Middleware = Middleware;
/**
 * Defines the Interceptor. The Interceptor should implement `HttpInterceptor`, `RpcInterceptor` or `WsInterceptor` interface.
 */
function Interceptor() {
    return (target) => { };
}
exports.Interceptor = Interceptor;
function mixin(mixinClass) {
    this.offset = this.offset ? ++this.offset : (Math.random() * 100);
    Object.defineProperty(mixinClass, 'name', { value: JSON.stringify(this.offset) });
    Component()(mixinClass);
    return mixinClass;
}
exports.mixin = mixin;
