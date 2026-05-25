import { ExecutionContext } from './execution-context.interface.js';

/**
 * @publicApi
 */
export type CustomParamFactory<TData = any, TOutput = any> = (
  data: TData,
  context: ExecutionContext,
) => TOutput;
