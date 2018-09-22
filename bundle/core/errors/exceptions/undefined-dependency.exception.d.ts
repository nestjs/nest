import { RuntimeException } from './runtime.exception';
import { InjectorDependencyContext } from '../../injector/injector';
export declare class UndefinedDependencyException extends RuntimeException {
    constructor(type: string, undefinedDependencyContext: InjectorDependencyContext);
}
