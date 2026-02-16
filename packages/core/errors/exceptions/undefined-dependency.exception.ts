import { InjectorDependencyContext } from '../../injector/injector.js';
import { Module } from '../../injector/module.js';
import { UNKNOWN_DEPENDENCIES_MESSAGE } from '../messages.js';
import { RuntimeException } from './runtime.exception.js';

export class UndefinedDependencyException extends RuntimeException {
  constructor(
    type: string,
    undefinedDependencyContext: InjectorDependencyContext,
    moduleRef?: Module,
  ) {
    super(
      UNKNOWN_DEPENDENCIES_MESSAGE(type, undefinedDependencyContext, moduleRef),
    );
  }
}
