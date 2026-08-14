import { REDIRECT_METADATA } from '../../constants.js';

/**
 * Redirects request to the specified URL.
 *
 * @publicApi
 */
export function Redirect(url = '', statusCode?: number): MethodDecorator {
  return (
    target: object,
    key: string | symbol,
    descriptor: TypedPropertyDescriptor<any>,
  ) => {
    Reflect.defineMetadata(
      REDIRECT_METADATA,
      { statusCode, url },
      descriptor.value,
    );
    return descriptor;
  };
}
