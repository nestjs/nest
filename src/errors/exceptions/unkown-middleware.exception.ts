import { RuntimeException } from "./runtime.exception";

export class UnkownMiddlewareException extends RuntimeException {

    constructor() {
        super(`Not recognized middleware - runtime error!`);
    }

}