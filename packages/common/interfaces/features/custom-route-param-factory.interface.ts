export type CustomParamFactory<TData = any, TRequest = any, TResult = any> = (
  data: TData,
  req: TRequest,
) => TResult;
