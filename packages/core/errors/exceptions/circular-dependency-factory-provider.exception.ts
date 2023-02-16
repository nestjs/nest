import { InjectionToken } from '@nestjs/common';
import { RuntimeException } from './runtime.exception';

export class CircularDependencyFactoryProviderException extends RuntimeException {
  constructor(
    injectionToken1: InjectionToken,
    injectionToken2: InjectionToken,
  ) {
    super(
      `A circular dependency has been detected between Provider ${injectionToken1.toString()} and Provider ${injectionToken2.toString()}. Circular dependencies between Factory Providers are not supported.`,
    );
  }
}
