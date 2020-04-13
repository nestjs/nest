import { UNKNOWN_DEPENDENCIES_MESSAGE } from '../messages';
import { RuntimeException } from './runtime.exception';
import { InstanceWrapper } from '../../injector/instance-wrapper';
import { InjectorDependencyContext } from '../../injector/injector';
import { Module } from '../../injector/module';

export class UnknownDependenciesException extends RuntimeException {
  constructor(
    instanceWrapper: InstanceWrapper,
    dependencyContext: InjectorDependencyContext,
    module?: Module,
  ) {
    super(
      UNKNOWN_DEPENDENCIES_MESSAGE(instanceWrapper, dependencyContext, module),
    );
  }
}
