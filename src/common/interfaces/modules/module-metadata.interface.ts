import {Controller} from '../controllers/controller.interface';

import {NestModule} from './nest-module.interface';

export interface ModuleMetadata {
  modules?: NestModule[]|any[];
  components?: any[];
  controllers?: Controller[]|any[];
  exports?: any[];
}
