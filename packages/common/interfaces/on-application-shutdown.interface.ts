/**
 * @publicApi
 *
 * @description
 * Interface defining method to respond to system signals (when application gets
 * shutdown by, e.g., SIGTERM)
 *
 * @see [Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events)
 */
export interface OnApplicationShutdown {
  onApplicationShutdown(signal?: string): any;
}
