import { Type } from './../index';

export interface ExecutionContext {
  getClass<T = any>(): Type<T>;
  getHandler(): Function;
  getArgs<T extends Array<any> = any[]>(): T;
  getArgByIndex<T = any>(index: number): T;
}
