import { Reflector } from '../services';

export type Decorator = (...args: any) => unknown | Promise<unknown>;

/**
 * When OnModuleInithook is invoked, it is responsible for enclosing certain functions of the Provider and Controller in the Nest IOC.
 *
 * Lazy Decorator is basically one of the Providers in Nest IOC, so DI is possible.
 *
 * For example, CashManager can also inject, so you can apply cache to Provider.
 */
export interface LazyDecorator {
  wrap(
    reflector: Reflector,
    instance: any,
    methodName: string,
  ): Decorator | undefined;
}
