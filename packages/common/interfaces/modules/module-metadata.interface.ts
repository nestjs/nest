import { NestModule } from './nest-module.interface';
import { Controller } from '../controllers/controller.interface';
import { DynamicModule } from './dynamic-module.interface';
import { Type } from '../type.interface';
import { Provider } from './provider.interface';

export interface ModuleMetadata {
  imports?: Array<Type<any> | DynamicModule | any[]>;
  controllers?: Type<any>[];
  providers?: Provider[];
  exports?: Array<DynamicModule | string | Provider | any[]>;
  /** @deprecated */
  modules?: Array<Type<any> | DynamicModule | any[]>;
  /** @deprecated */
  components?: Provider[];
}
