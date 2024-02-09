import { HEADERS_METADATA } from '../../constants';
import { extendArrayMetadata } from '../../utils/extend-metadata.util';

/**
 * Request method Decorator.  Sets a response header.
 *
 * For example:
 * `@Header('Cache-Control', 'none')`
 * `@Header('Cache-Control', () => 'none')`
 *
 * @param name string to be used for header name
 * @param value string to be used for header value
 *
 * @see [Headers](https://docs.nestjs.com/controllers#headers)
 *
 * @publicApi
 */
export function Header(
  name: string,
  value: string | (() => string),
): MethodDecorator {
  return (
    target: object,
    key: string | symbol,
    descriptor: TypedPropertyDescriptor<any>,
  ) => {
    extendArrayMetadata(HEADERS_METADATA, [{ name, value }], descriptor.value);
    return descriptor;
  };
}
