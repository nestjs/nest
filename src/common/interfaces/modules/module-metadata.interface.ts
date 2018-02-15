import { NestModule } from './nest-module.interface';
import { Controller } from '../controllers/controller.interface';
import { DynamicModule } from './dynamic-module.interface';

export interface ModuleMetadata {
  imports?: any[];
  components?: any[];
  controllers?: any[];
  exports?: any[];
  modules?: any[];
}
