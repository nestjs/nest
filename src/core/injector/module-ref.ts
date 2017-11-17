import { OpaqueToken } from './module';

export abstract class ModuleRef {
    public abstract get<T>(type: OpaqueToken): T;
}