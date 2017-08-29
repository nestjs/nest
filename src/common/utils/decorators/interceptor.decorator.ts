/**
 * Defines the Interceptor. The Interceptor should implement `HttpInterceptor`, `RpcInterceptor` or `WsInterceptor` interface.
 */
export const Interceptor = (): ClassDecorator => {
    return (target: object) => {};
};