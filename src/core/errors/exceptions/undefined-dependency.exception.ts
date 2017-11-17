import { RuntimeException } from './runtime.exception';
import { UnknownDependenciesMessage } from '../messages';

export class UndefinedDependencyException extends RuntimeException {
    constructor(type: string) {
        super(UnknownDependenciesMessage(type));
    }
}