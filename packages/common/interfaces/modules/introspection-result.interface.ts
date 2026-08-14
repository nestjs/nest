import { Scope } from '../scope-options.interface.js';

/**
 * @publicApi
 */
export interface IntrospectionResult {
  /**
   * Enum defining lifetime of host class or factory.
   */
  scope: Scope;
}
