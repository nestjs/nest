import { NestModule } from './nest-module.interface';
import { Controller } from '../controllers/controller.interface';
import { DynamicModule } from './dynamic-module.interface';
import { Type } from '../type.interface';
import { Provider } from './provider.interface';
import { ForwardReference } from './forward-reference.interface';

export interface ModuleMetadata {
  imports?: Array<Type<any> | DynamicModule | ForwardReference>;
  controllers?: Type<any>[];
  providers?: Provider[];
  exports?: Array<DynamicModule | string | Provider | ForwardReference>;
  /** @deprecated */
  modules?: Array<Type<any> | DynamicModule | ForwardReference>;
  /** @deprecated */
  components?: Provider[];
}
