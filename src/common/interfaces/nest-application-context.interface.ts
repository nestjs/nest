import { Metatype } from './metatype.interface';
import { LoggerService } from '../services/logger.service';

export interface INestApplicationContext {
  /**
   * Allows you to navigate through the modules tree, for example, to pull out a specific instance from the selected module.
   * @returns INestApplicationContext
   */
  select<T>(module: Metatype<T>): INestApplicationContext;

  /**
   * Makes possible to retrieve the instance of the component or controller available inside the processed module.
   * @returns T
   */
  get<T>(metatypeOrToken: Metatype<T> | string | Symbol): T;
}
