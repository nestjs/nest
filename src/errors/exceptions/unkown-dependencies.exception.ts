import { RuntimeException } from './runtime.exception';
import { UnkownDependenciesMessage } from '../messages';

export class UnkownDependenciesException extends RuntimeException {
    constructor(type: string) {
        super(UnkownDependenciesMessage(type));
    }
}