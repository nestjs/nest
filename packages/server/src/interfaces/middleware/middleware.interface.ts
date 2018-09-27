export type MiddlewareFunction<TRequest, TResponse, TResult> = (
  req?: TRequest,
  res?: TResponse,
  next?: Function,
) => TResult;
