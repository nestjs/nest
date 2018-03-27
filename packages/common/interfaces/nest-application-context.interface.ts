import { Type } from './type.interface';
import { LoggerService } from '../services/logger.service';

export interface INestApplicationContext {
  /**
   * Allows navigating through the modules tree, for example, to pull out a specific instance from the selected module.
   * @returns {INestApplicationContext}
   */
  select<T>(module: Type<T>): INestApplicationContext;

  /**
   * Retrieves an instance of either injectable or controller available inside the processed module, otherwise, returns null.
   * @returns {T}
   */
  get<T>(typeOrToken: Type<T> | string | symbol): T | null;

  /**
   * Retrieves an instance of either injectable or controller available inside any module, otherwise, returns null.
   * @returns {T}
   */
  find<T>(typeOrToken: Type<T> | string | symbol): T | null;
}
