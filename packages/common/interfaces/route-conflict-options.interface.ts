/**
 * @publicApi
 */
export type RouteConflictPolicy = 'warn' | 'error';

/**
 * @publicApi
 */
export interface RouteConflictOptions {
  /**
   * Defines how Nest should report detected ambiguous route shadowing.
   *
   * Defaults to `warn`.
   */
  policy?: RouteConflictPolicy;
}
