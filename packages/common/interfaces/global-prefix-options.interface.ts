import { RouteInfo } from './middleware';

/**
 * @publicApi
 */
export interface GlobalPrefixOptions {
  exclude?: Array<string | RouteInfo>;
}
