export enum LifeCycleType {
  GUARDS = 'GUARDS',
  PIPES = 'PIPES',
  INTERCEPTORS = 'INTERCEPTORS',
}

export type ValidateLifeCycleOrder<T, U extends LifeCycleType> = Exclude<
  LifeCycleType,
  U
> extends never
  ? T
  : 'all must be unique';

export type LifeCycleOrder = [LifeCycleType, LifeCycleType, LifeCycleType];
