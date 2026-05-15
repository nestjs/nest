import { RequestMethod } from '@nestjs/common';
import { type VersionValue } from '@nestjs/common/internal';
import { InstanceWrapper } from '../../injector/instance-wrapper.js';
import { RouterProxyCallback } from '../router-proxy.js';

/**
 * Loose callable signature shared by the various handler wrappers that
 * are composed before adapter registration (host filter, version
 * filter, request-scoped handler, etc.). They all accept the (req, res,
 * next) trio but may be invoked variadically by adapter shims.
 */
export type ResolvedRouteHandler = (...args: unknown[]) => unknown;

/**
 * Final route description produced during the "collect" phase of the
 * router pipeline and consumed during the "register" phase. Holds the
 * fully composed path, the pre-built handler chain (proxy + host filter
 * + optional version filter), and the metadata needed to register the
 * route on the HTTP adapter and to insert an entrypoint into the graph
 * inspector.
 */
export interface ResolvedRoute {
  method: RequestMethod;
  path: string;
  host: string | RegExp | Array<string | RegExp> | undefined;
  version: VersionValue | undefined;
  methodVersion: VersionValue | undefined;
  controllerVersion: VersionValue | undefined;
  handler: ResolvedRouteHandler;
  targetCallback: RouterProxyCallback;
  methodName: string;
  instanceWrapper: InstanceWrapper;
}
