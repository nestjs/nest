import { ResolvedRoute } from './resolved-route.interface.js';

/**
 * Options that control how `Resolver.resolve` walks the controller
 * graph and registers routes on the HTTP adapter. Used internally to
 * thread route-collection and deferred-registration concerns through
 * the resolver chain without bloating individual method signatures.
 */
export interface RouteResolutionOptions {
  /**
   * Invoked once for each route after its final path, host and version
   * have been composed. Lets the caller observe resolved routes (for
   * conflict detection, specificity sorting, etc.) without coupling
   * those concerns to the resolver itself.
   */
  onRouteResolved?: (route: ResolvedRoute) => void;

  /**
   * When `true`, the resolver still walks every controller and emits
   * `onRouteResolved` callbacks but skips the actual adapter
   * registration step. The caller is then responsible for ordering and
   * installing the collected routes via `registerResolvedRoute`.
   * Defaults to `false`.
   */
  deferRegistration?: boolean;
}
