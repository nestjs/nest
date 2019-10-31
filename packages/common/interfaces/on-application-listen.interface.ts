/**
 * Interface defining method called once the application is listened.
 *
 * @see [Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events)
 *
 * @publicApi
 */
export interface OnApplicationListen {
  onApplicationListen(): any;
}
