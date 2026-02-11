import { METHOD_METADATA, PATH_METADATA, SSE_METADATA } from '../../constants';
import { RequestMethod } from '../../enums/request-method.enum';
import { SseOptions } from '../../interfaces/http/sse-options.interface';

/**
 * Declares this route as a Server-Sent-Events endpoint
 *
 * @param path Route path (defaults to '/')
 * @param method HTTP method or options (defaults to GET)
 *
 * @publicApi
 *
 * @example
 * ```typescript
 * @Sse('events')
 * events(): Observable<MessageEvent> { ... }
 *
 * @Sse('chat', RequestMethod.POST)
 * chat(): Observable<MessageEvent> { ... }
 * ```
 */
export function Sse(path: string, method: RequestMethod): MethodDecorator;
export function Sse(path: string, options: SseOptions): MethodDecorator;
export function Sse(path?: string): MethodDecorator;
export function Sse(
  path?: string,
  methodOrOptions?: RequestMethod | SseOptions,
): MethodDecorator {
  return (
    target: object,
    key: string | symbol,
    descriptor: TypedPropertyDescriptor<any>,
  ) => {
    path = path && path.length ? path : '/';

    let method: RequestMethod = RequestMethod.GET;

    if (typeof methodOrOptions === 'number') {
      method = methodOrOptions;
    } else if (methodOrOptions && 'method' in methodOrOptions) {
      method = methodOrOptions.method ?? RequestMethod.GET;
    }

    Reflect.defineMetadata(PATH_METADATA, path, descriptor.value);
    Reflect.defineMetadata(METHOD_METADATA, method, descriptor.value);
    Reflect.defineMetadata(SSE_METADATA, true, descriptor.value);
    return descriptor;
  };
}
