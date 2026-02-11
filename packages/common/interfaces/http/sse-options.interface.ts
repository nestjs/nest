import { RequestMethod } from '../../enums/request-method.enum';

/**
 * Configuration options for @Sse() decorator
 *
 * @publicApi
 */
export interface SseOptions {
  /**
   * HTTP method for the SSE endpoint.
   * @default RequestMethod.GET
   */
  method?: RequestMethod;
}
