import { TrpcParamtype } from '../enums';
import { addTrpcParamMetadata } from './param-metadata.util';

/**
 * Extracts request context data from a tRPC procedure call.
 *
 * - `@TrpcContext()` injects the full tRPC context object.
 * - `@TrpcContext('field')` injects a field from the context object.
 *
 * @publicApi
 */
export function TrpcContext(data?: string): ParameterDecorator {
  return (target: object, propertyKey: string | symbol | undefined, index) => {
    addTrpcParamMetadata(
      target,
      propertyKey,
      index,
      TrpcParamtype.CONTEXT,
      data,
    );
  };
}
