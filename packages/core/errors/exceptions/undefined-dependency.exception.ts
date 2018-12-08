import { InjectorDependencyContext } from '../../injector/injector';
import { UNKNOWN_DEPENDENCIES_MESSAGE } from '../messages';
import { RuntimeException } from './runtime.exception';
import { Module } from '../../injector/module';

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
