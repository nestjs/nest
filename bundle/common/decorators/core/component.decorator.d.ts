/**
 * Defines the injectable class. This class can inject dependencies through constructor.
 * Those dependencies have to belong to the same module.
 */
export declare function Injectable(): ClassDecorator;
/**
 * @deprecated
 * Defines the Component. The component can inject dependencies through constructor.
 * Those dependencies have to belong to the same module.
 */
export declare function Component(): ClassDecorator;
/**
 * @deprecated
 * Defines the Pipe. The Pipe should implement the `PipeTransform` interface.
 */
export declare function Pipe(): ClassDecorator;
/**
 * @deprecated
 * Defines the Guard. The Guard should implement the `CanActivate` interface.
 */
export declare function Guard(): ClassDecorator;
/**
 * @deprecated
 * Defines the Middleware. The Middleware should implement the `NestMiddleware` interface.
 */
export declare function Middleware(): ClassDecorator;
/**
 * @deprecated
 * Defines the Interceptor. The Interceptor should implement `HttpInterceptor`, `RpcInterceptor` or `WsInterceptor` interface.
 */
export declare function Interceptor(): ClassDecorator;
export declare function mixin(mixinClass: any): any;
