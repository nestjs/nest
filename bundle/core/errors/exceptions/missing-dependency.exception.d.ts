import { RuntimeException } from './runtime.exception';
export declare class MissingRequiredDependencyException extends RuntimeException {
    constructor(name: string, context: string);
}
