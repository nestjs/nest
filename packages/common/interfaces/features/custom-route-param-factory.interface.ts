import { ExecutionContext } from '..';

/**
 * @publicApi
 */
export type CustomParamFactory<TData = any, TOutput = any> = (
  data: TData,
  context: ExecutionContext,
) => TOutput;
