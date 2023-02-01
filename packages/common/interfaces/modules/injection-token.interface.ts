import { Abstract } from '../abstract.interface';
import { Type } from '../type.interface';

/**
 * @publicApi
 */
export type InjectionToken =
  | string
  | symbol
  | Type<any>
  | Abstract<any>
  | Function;
