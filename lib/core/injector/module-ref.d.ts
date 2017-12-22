import { OpaqueToken } from './module';
export abstract class ModuleRef {
  abstract get<T>(type: OpaqueToken): T;
}
