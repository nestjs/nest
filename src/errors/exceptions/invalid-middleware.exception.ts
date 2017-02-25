import { RuntimeException } from "./runtime.exception";
import { getInvalidMiddlewareMessage } from '../messages';

export class InvalidMiddlewareException extends RuntimeException {
    constructor(name: string) {
        super(getInvalidMiddlewareMessage(name));
    }
}