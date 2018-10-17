import { Type } from '../type.interface';
import { DynamicModule } from './dynamic-module.interface';
import { ForwardReference } from './forward-reference.interface';
import { Provider } from './provider.interface';

export interface ModuleMetadata {
  imports?: Array<
    Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference
  >;
  controllers?: Type<any>[];
  providers?: Provider[];
  exports?: Array<
    | DynamicModule
    | Promise<DynamicModule>
    | string
    | symbol
    | Provider
    | ForwardReference
  >;
  /** @deprecated */
  modules?: Array<
    Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference
  >;
  /** @deprecated */
  components?: Provider[];
}
