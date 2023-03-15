import { InjectorDependencyContext } from '../../injector/injector';
import { Module } from '../../injector/module';
import { UNKNOWN_DEPENDENCIES_MESSAGE } from '../messages';
import { RuntimeException } from './runtime.exception';

export class UnknownDependenciesException extends RuntimeException {
  constructor(
    public readonly type: string | symbol,
    public readonly context: InjectorDependencyContext,
    public readonly moduleRef?: Module,
    public readonly metadata?: { id: string },
  ) {
    super(UNKNOWN_DEPENDENCIES_MESSAGE(type, context, moduleRef));
  }
}
