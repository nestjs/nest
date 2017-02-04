import { RuntimeException } from "./runtime.exception";

export class InvalidModuleConfigException extends RuntimeException {

    constructor(property: string) {
        super(`Invalid property [${property}] in @Module({}) annotation.`);
    }

}