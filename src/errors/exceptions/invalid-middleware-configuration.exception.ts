import { RuntimeException } from "./runtime.exception";

export class InvalidMiddlewareConfigurationException extends RuntimeException {

    constructor() {
        super(`Invalid middleware configuration passed in module "configure()" method.`);
    }

}