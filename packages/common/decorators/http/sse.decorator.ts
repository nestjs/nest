import {
  METHOD_METADATA,
  PATH_METADATA,
  SSE_METADATA,
  SSE_OPTIONS_METADATA,
} from '../../constants.js';
import { RequestMethod } from '../../enums/request-method.enum.js';

/**
 * Interface defining options that can be passed to `@Sse()` decorator
 *
 * @publicApi
 */
export interface SseOptions {
  /**
   * HTTP request method of the route (default: `RequestMethod.GET`).
   */
  method?: RequestMethod;

  /**
   * Maximum number of characters of event data (`data` plus `comment`) that
   * may wait for a client that is not reading its events (default:
   * 4 * 1024 * 1024, i.e. 4M characters). Events wait once the stream and
   * socket buffers are full, as the producer cannot be paused. Past this
   * limit, the connection is dropped as if the client had disconnected, and
   * a warning is logged. Set to 0 or `Infinity` to disable.
   */
  maxPendingDataLength?: number;
}

/**
 * Declares this route as a Server-Sent-Events endpoint
 *
 * Events wait in memory for a client that is not reading them. Once more than
 * `maxPendingDataLength` characters of event data (4M by default) wait for a
 * client whose stream is backed up, its connection is dropped. An
 * `EventSource` then reconnects, sending the id of the last event it received.
 * Raise the limit for a route that streams bulk data faster than its clients
 * read, or set it to 0 or `Infinity` to lift it.
 *
 * @param path route path (default: `/`)
 * @param options `SseOptions` object specifying:
 * - `method` - HTTP request method of the route (default: `GET`).
 * - `maxPendingDataLength` - maximum number of characters of event data that
 * may wait for a client that is not reading them (default: 4M). 0 or
 * `Infinity` lifts the limit.
 *
 * @example
 * ```ts
 * @Sse('logs', { maxPendingDataLength: 64 * 1024 * 1024 })
 * logs(): Observable<MessageEvent> { ... }
 * ```
 *
 * @publicApi
 */
export function Sse(path?: string, options: SseOptions = {}): MethodDecorator {
  return (
    target: object,
    key: string | symbol,
    descriptor: TypedPropertyDescriptor<any>,
  ) => {
    path = path && path.length ? path : '/';

    Reflect.defineMetadata(PATH_METADATA, path, descriptor.value);
    Reflect.defineMetadata(
      METHOD_METADATA,
      options[METHOD_METADATA] ?? RequestMethod.GET,
      descriptor.value,
    );
    Reflect.defineMetadata(SSE_METADATA, true, descriptor.value);
    Reflect.defineMetadata(
      SSE_OPTIONS_METADATA,
      { maxPendingDataLength: options.maxPendingDataLength },
      descriptor.value,
    );
    return descriptor;
  };
}
