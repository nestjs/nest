import { RuntimeException } from './runtime.exception';
export declare class UndefinedDependencyException extends RuntimeException {
    constructor(type: string, index: number, length: number);
}
