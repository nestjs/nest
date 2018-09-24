import { InjectorDependencyContext } from '../../injector/injector';
import { RuntimeException } from './runtime.exception';
export declare class UnknownDependenciesException extends RuntimeException {
    constructor(type: string, unknownDependencyContext: InjectorDependencyContext);
}
