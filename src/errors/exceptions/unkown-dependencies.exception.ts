import { RuntimeException } from "./runtime.exception";

export class UnkownDependenciesException extends RuntimeException {

    constructor(type) {
        super(`Can't recognize dependencies of ${type}.`);
    }

}