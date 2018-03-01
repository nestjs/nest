/**
 * Defines the injectable class. This class can inject dependencies through constructor.
 * Those dependencies should belongs to the same module.
 */
export declare function Injectable(): ClassDecorator;
/**
 * Defines the Component. The component can inject dependencies through constructor.
 * Those dependencies should belongs to the same module.
 */
export declare function Component(): ClassDecorator;
/**
 * Defines the Pipe. The Pipe should implements the `PipeTransform` interface.
 */
export declare function Pipe(): ClassDecorator;
/**
 * Defines the Guard. The Guard should implement the `CanActivate` interface.
 */
export declare function Guard(): ClassDecorator;
/**
 * Defines the Middleware. The Middleware should implement the `NestMiddleware` interface.
 */
export declare function Middleware(): ClassDecorator;
/**
 * Defines the Interceptor. The Interceptor should implement `HttpInterceptor`, `RpcInterceptor` or `WsInterceptor` interface.
 */
export declare function Interceptor(): ClassDecorator;
export declare function mixin(mixinClass: any): any;
