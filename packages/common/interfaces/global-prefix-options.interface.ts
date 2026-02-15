import { RouteInfo } from './middleware/index.js';

/**
 * @publicApi
 */
export interface GlobalPrefixOptions<T = string | RouteInfo> {
  exclude?: T[];
}
