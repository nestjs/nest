import { RequestMethod } from '../../enums';
import { RouterProxyCallback } from './router-proxy-callback.interface';

export interface RoutePathProperties {
  path: string;
  requestMethod: keyof RequestMethod;
  targetCallback: RouterProxyCallback;
  methodName: string;
}
