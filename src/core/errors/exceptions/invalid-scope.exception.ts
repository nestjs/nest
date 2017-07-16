import { RuntimeException } from './runtime.exception';
import { InvalidModuleScope } from '../messages';

export class InvalidModuleScopeException extends RuntimeException {
    constructor(name: string) {
        super(InvalidModuleScope(name));
    }
}