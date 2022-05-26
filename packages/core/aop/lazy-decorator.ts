import { Reflector } from '../services';

export type Decorator = (...args: any) => unknown | Promise<unknown>;

/**
 * Aspect 선언시 구현이 필요합니다.
 */
export interface LazyDecorator {
  wrap(
    reflector: Reflector,
    instance: any,
    methodName: string,
  ): Decorator | undefined;
}
