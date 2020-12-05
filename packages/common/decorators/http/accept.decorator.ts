import { ACCEPT_METADATA } from '../../constants';
import { extendArrayMetadata } from '../../utils/extend-metadata.util';

/**
 * Request method Decorator.  Sets accept.
 *
 * For example:
 * `@Accept('application/json')`
 *
 * @param heading string to be used for heading name
 *
 * @publicApi
 */
export function Accept(heading: string): MethodDecorator {
  return (
    target: object,
    key: string | symbol,
    descriptor: TypedPropertyDescriptor<any>,
  ) => {
    extendArrayMetadata(ACCEPT_METADATA, [{ heading }], descriptor.value);
    return descriptor;
  };
}
