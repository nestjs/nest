import { RuntimeException } from "./runtime.exception";

export class InvalidPathVariableException extends RuntimeException {

    constructor(annotationName: string) {
        super(`Invalid path in @${annotationName}!`);
    }

}