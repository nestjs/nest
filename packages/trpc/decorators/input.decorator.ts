import { TrpcParamtype } from '../enums';
import { addTrpcParamMetadata } from './param-metadata.util';

/**
 * Extracts input data from a tRPC procedure call.
 *
 * - `@Input()` injects the full input object.
 * - `@Input('field')` injects a field from the input object.
 *
 * @publicApi
 */
export function Input(data?: string): ParameterDecorator {
  return (target: object, propertyKey: string | symbol | undefined, index) => {
    addTrpcParamMetadata(target, propertyKey, index, TrpcParamtype.INPUT, data);
  };
}
