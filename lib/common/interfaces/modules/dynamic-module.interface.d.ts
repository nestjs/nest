import { ModuleMetadata } from './module-metadata.interface';
import { Type } from '../type.interface';
export interface DynamicModule extends ModuleMetadata {
    module: Type<any>;
}
