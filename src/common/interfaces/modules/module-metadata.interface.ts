import { NestModule } from './nest-module.interface';
import { Controller } from '../controllers/controller.interface';

export interface ModuleMetadata {
  modules?: NestModule[] | any[];
  imports?: NestModule[] | any[];
  components?: any[];
  controllers?: Controller[] | any[];
  exports?: any[];
}
