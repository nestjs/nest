import { OpaqueToken } from './module';
export declare abstract class ModuleRef {
    abstract get<T>(type: OpaqueToken): T;
}
