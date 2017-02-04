import { RuntimeException } from "./runtime.exception";

export class CircularDependencyException extends RuntimeException {

    constructor(type) {
        super(`Can't create instance of ${type}. It is possible `
            + `that you are trying to do circular-dependency A->B, B->A.`);
    }

}