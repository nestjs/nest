import { RuntimeException } from "./runtime.exception";

export class InvalidMiddlewareException extends RuntimeException {

    constructor() {
        super(`You are trying to setup middleware without "resolve" method.`);
    }

}