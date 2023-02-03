/**
 * @publicApi
 */
export interface OverrideByFactoryOptions {
  factory: (...args: any[]) => any;
  inject?: any[];
}
