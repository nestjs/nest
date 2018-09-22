import { RuntimeException } from './runtime.exception';
import { InjectorDependencyContext } from '../../injector/injector';
export declare class UnknownDependenciesException extends RuntimeException {
    constructor(type: string, unknownDependencyContext: InjectorDependencyContext);
}
