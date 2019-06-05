import { Abstract } from '../abstract.interface';
import { Scope } from '../scope-options.interface';
import { Type } from '../type.interface';

export type Provider<T = any> =
  | Type<any>
  | ClassProvider<T>
  | ValueProvider<T>
  | FactoryProvider<T>
  | ExistingProvider<T>;

export interface ClassProvider<T = any> {
  provide: string | symbol | Type<any> | Abstract<any> | Function;
  useClass: Type<T>;
  scope?: Scope;
}

export interface ValueProvider<T = any> {
  provide: string | symbol | Type<any> | Abstract<any> | Function;
  useValue: T;
}

export interface FactoryProvider<T = any> {
  provide: string | symbol | Type<any> | Abstract<any> | Function;
  useFactory: (...args: any[]) => T;
  inject?: Array<Type<any> | string | symbol | Abstract<any> | Function>;
  scope?: Scope;
}

export interface ExistingProvider<T = any> {
  provide: string | symbol | Type<any> | Abstract<any> | Function;
  useExisting: any;
}
