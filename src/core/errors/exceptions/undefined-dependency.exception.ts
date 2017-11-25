import {UnknownDependenciesMessage} from '../messages';

import {RuntimeException} from './runtime.exception';

export class UndefinedDependencyException extends RuntimeException {
  constructor(type: string) { super(UnknownDependenciesMessage(type)); }
}