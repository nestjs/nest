import { RuntimeException } from "./runtime.exception";
import { getInvalidModuleConfigMessage } from '../messages';

export class InvalidModuleConfigException extends RuntimeException {
    constructor(property: string) {
        super(getInvalidModuleConfigMessage(property));
    }
}