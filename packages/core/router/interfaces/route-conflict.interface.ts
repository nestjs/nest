import { ResolvedRoute } from './resolved-route.interface.js';

/**
 * Distinguishes the two flavors of route overlap.
 * - `duplicate` — identical method + path + version + host registered twice.
 * - `shadow`    — patterns can match the same request but are not identical.
 */
export type ConflictKind = 'duplicate' | 'shadow';

export interface RouteConflict {
  /** Route registered first; on order-sensitive adapters this wins. */
  winner: ResolvedRoute;
  /** Route registered later; on order-sensitive adapters this never matches. */
  shadowed: ResolvedRoute;
  kind: ConflictKind;
}
