import { Type } from './type.interface';

export interface Constructor extends Function {
  (...args: any[]): Type<any>;
}
