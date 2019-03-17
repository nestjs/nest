import { Scope } from '../scope-options.interface';
import { Type } from '../type.interface';

export type Provider<T = any> =
  | Type<any>
  | ClassProvider<T>
  | ValueProvider<T>
  | FactoryProvider<T>;

export interface ClassProvider<T = any> {
  provide: string | symbol | Type<any>;
  useClass: Type<T>;
  scope?: Scope;
}

export interface ValueProvider<T = any> {
  provide: string | symbol | Type<any>;
  useValue: T;
}

export interface FactoryProvider<T = any> {
  provide: string | symbol | Type<any>;
  useFactory: (...args: any[]) => T;
  inject?: Array<Type<any> | string | any>;
  scope?: Scope;
}
