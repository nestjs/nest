/**
 * @publicApi
 *
 * @description
 * Interface defining method called once the host module has been initialized.
 *
 * @see [Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events)
 */
export interface OnModuleInit {
  onModuleInit(): any;
}
