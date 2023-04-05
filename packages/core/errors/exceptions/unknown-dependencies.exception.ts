import { InjectorDependencyContext } from '../../injector/injector';
import { Module } from '../../injector/module';
import { UNKNOWN_DEPENDENCIES_MESSAGE } from '../messages';
import { RuntimeException } from './runtime.exception';

export class UnknownDependenciesException extends RuntimeException {
  public readonly moduleRef: { id: string } | undefined;

  constructor(
    public readonly type: string | symbol,
    public readonly context: InjectorDependencyContext,
    moduleRef?: Module,
    public readonly metadata?: { id: string },
  ) {
    super(UNKNOWN_DEPENDENCIES_MESSAGE(type, context, moduleRef));
    this.moduleRef = moduleRef && { id: moduleRef.id };
  }
}
