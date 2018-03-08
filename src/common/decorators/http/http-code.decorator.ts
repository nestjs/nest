import { HTTP_CODE_METADATA } from '../../constants';

/**
 * Defines the HTTP response status code.
 * It overrides default status code for the given request method.
 *
 * @param  {number} statusCode
 */
export function HttpCode(statusCode: number): MethodDecorator {
  return (target: object, key, descriptor) => {
    Reflect.defineMetadata(HTTP_CODE_METADATA, statusCode, descriptor.value);
    return descriptor;
  };
}
