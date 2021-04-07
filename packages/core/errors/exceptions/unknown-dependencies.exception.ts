import { InjectorDependencyContext } from '../../injector/injector';
import { Module } from '../../injector/module';
import { UNKNOWN_DEPENDENCIES_MESSAGE } from '../messages';

import { RuntimeException } from './runtime.exception';

export class UnknownDependenciesException extends RuntimeException {
  constructor(
    type: string | symbol,
    unknownDependencyContext: InjectorDependencyContext,
    module?: Module,
  ) {
    super(UNKNOWN_DEPENDENCIES_MESSAGE(type, unknownDependencyContext, module));
  }
}
