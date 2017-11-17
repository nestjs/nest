import {UnknownDependenciesMessage} from '../messages';

import {RuntimeException} from './runtime.exception';

export class UnknownDependenciesException extends RuntimeException {
  constructor(type: string) { super(UnknownDependenciesMessage(type)); }
}