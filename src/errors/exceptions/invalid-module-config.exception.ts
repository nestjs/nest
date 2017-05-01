import { RuntimeException } from './runtime.exception';
import { InvalidModuleConfigMessage } from '../messages';

export class InvalidModuleConfigException extends RuntimeException {
    constructor(property: string) {
        super(InvalidModuleConfigMessage(property));
    }
}