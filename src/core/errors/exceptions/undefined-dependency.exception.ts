import { RuntimeException } from './runtime.exception';
import { UnknownDependenciesMessage } from '../messages';

export class UndefinedDependencyException extends RuntimeException {
    constructor(type: string, index: number, length: number) {
        super(UnknownDependenciesMessage(type, index, length));
    }
}