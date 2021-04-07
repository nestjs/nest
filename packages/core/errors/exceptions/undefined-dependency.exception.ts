import { InjectorDependencyContext } from '../../injector/injector';
import { Module } from '../../injector/module';
import { UNKNOWN_DEPENDENCIES_MESSAGE } from '../messages';

import { RuntimeException } from './runtime.exception';

export class UndefinedDependencyException extends RuntimeException {
  constructor(
    type: string,
    undefinedDependencyContext: InjectorDependencyContext,
    module?: Module,
  ) {
    super(
      UNKNOWN_DEPENDENCIES_MESSAGE(type, undefinedDependencyContext, module),
    );
  }
}
