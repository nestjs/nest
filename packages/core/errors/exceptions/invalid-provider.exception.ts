import { InjectorDependency } from '../../injector/injector.js';
import { INVALID_PROVIDER_MESSAGE } from '../messages.js';
import { RuntimeException } from './runtime.exception.js';

export class InvalidProviderException extends RuntimeException {
  constructor(token: InjectorDependency, moduleName: string) {
    super(INVALID_PROVIDER_MESSAGE(token, moduleName));
  }
}
