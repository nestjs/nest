/**
 * Severity level applied to a single kind of route conflict detected at
 * bootstrap.
 *
 * @publicApi
 */
export type RouteConflictPolicyLevel = 'off' | 'warn' | 'error';

/**
 * Per-kind policy for overlapping routes detected at bootstrap.
 * `duplicate` covers identical (method, path, host, version) registrations.
 * `shadow` covers patterns that can match the same request (for example
 * `/users/me` vs `/users/:id`). Each kind defaults to `'off'`.
 *
 * @publicApi
 */
export interface RouteConflictPolicy {
  duplicate?: RouteConflictPolicyLevel;
  shadow?: RouteConflictPolicyLevel;
}

/**
 * Order in which routes are registered on the underlying HTTP adapter.
 * `'specificity'` registers literal segments before parametric and
 * wildcard ones on order-sensitive adapters (such as Express). Defaults
 * to `'declaration'`.
 *
 * @publicApi
 */
export type RouteResolutionStrategy = 'declaration' | 'specificity';
