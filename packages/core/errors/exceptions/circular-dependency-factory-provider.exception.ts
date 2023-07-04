import { RuntimeException } from './runtime.exception';

export class CircularDependencyFactoryProviderException extends RuntimeException {
  constructor(injectionPath: string[]) {
    super(
      `A circular dependency has been detected between factory providers. The injection path is: ${injectionPath.join(
        ' -> ',
      )}. Circular factory providers are not supported.`,
    );
  }
}
