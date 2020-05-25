import { SSE_METADATA, PATH_METADATA, METHOD_METADATA } from '../../constants';
import { RequestMethod } from '../../enums/request-method.enum';

/**
 * Declares this route as a Server-Sent-Events endpoint
 *
 * @publicApi
 */
export function Sse(path?: string): MethodDecorator {
  return (
    target: object,
    key: string | symbol,
    descriptor: TypedPropertyDescriptor<any>,
  ) => {
    Reflect.defineMetadata(
      PATH_METADATA,
      path && path.length ? path : '/',
      descriptor.value,
    );
    Reflect.defineMetadata(
      METHOD_METADATA,
      RequestMethod.GET,
      descriptor.value,
    );
    Reflect.defineMetadata(SSE_METADATA, true, descriptor.value);
    return descriptor;
  };
}
