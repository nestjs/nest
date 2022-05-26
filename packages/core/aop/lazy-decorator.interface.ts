import { Reflector } from '../services';

export type Decorator = (...args: any) => unknown | Promise<unknown>;

export interface LazyDecorator {
  wrap(
    reflector: Reflector,
    instance: any,
    methodName: string,
  ): Decorator | undefined;
}
