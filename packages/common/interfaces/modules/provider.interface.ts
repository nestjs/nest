import { Scope } from '../scope-options.interface';
import { Type } from '../type.interface';

export type Provider =
  | Type<any>
  | ClassProvider
  | ValueProvider
  | FactoryProvider;

export interface ClassProvider {
  provide: any;
  useClass: Type<any>;
  scope?: Scope;
}

export interface ValueProvider {
  provide: any;
  useValue: any;
}

export interface FactoryProvider {
  provide: any;
  useFactory: (...args: any[]) => any;
  inject?: Array<Type<any> | string | any>;
  scope?: Scope;
}
