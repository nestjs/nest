import { RuntimeException } from "./runtime.exception";
import { getUnkownDependenciesMessage } from '../messages';

export class UnkownDependenciesException extends RuntimeException {
    constructor(type: string) {
        super(getUnkownDependenciesMessage(type));
    }
}