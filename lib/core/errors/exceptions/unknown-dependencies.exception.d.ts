import { RuntimeException } from './runtime.exception';
export declare class UnknownDependenciesException extends RuntimeException {
    constructor(type: string, index: number, length: number);
}
