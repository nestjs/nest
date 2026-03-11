import { TRPC_PARAM_ARGS_METADATA } from '../constants';
import { TrpcParamtype } from '../enums';

export interface TrpcParamMetadata {
  index: number;
  type: TrpcParamtype;
  data?: string;
}

export function addTrpcParamMetadata(
  target: object,
  propertyKey: string | symbol | undefined,
  parameterIndex: number,
  paramtype: TrpcParamtype,
  data?: string,
): void {
  if (propertyKey == null) {
    return;
  }
  const callback = (target as Record<string | symbol, unknown>)[propertyKey];
  if (typeof callback !== 'function') {
    return;
  }

  const metadata: TrpcParamMetadata[] =
    Reflect.getMetadata(TRPC_PARAM_ARGS_METADATA, callback) ?? [];

  metadata.push({
    index: parameterIndex,
    type: paramtype,
    data,
  });
  metadata.sort((a, b) => a.index - b.index);

  Reflect.defineMetadata(TRPC_PARAM_ARGS_METADATA, metadata, callback);
}
