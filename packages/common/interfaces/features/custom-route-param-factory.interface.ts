import { ExecutionContext } from './execution-context.interface';

/**
 * @publicApi
 */
export type CustomParamFactory<TData = any, TOutput = any> = (
  data: TData,
  context: ExecutionContext,
) => TOutput;
