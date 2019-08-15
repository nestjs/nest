import { HTTP_CODE_METADATA } from '../../constants';

/**
 * @publicApi
 *
 * @description
 * Defines the HTTP response status code.  Overrides default status code for
 * the decorated request method.
 *
 * @see [Http Status Codes](https://docs.nestjs.com/controllers#status-code)
 */
export function HttpCode(statusCode: number): MethodDecorator {
  return (target: object, key, descriptor) => {
    Reflect.defineMetadata(HTTP_CODE_METADATA, statusCode, descriptor.value);
    return descriptor;
  };
}
