export declare type MiddlewareFunction<TRequest = any, TResponse = any, TResult = any> = (req?: TRequest, res?: TResponse, next?: Function) => TResult;
