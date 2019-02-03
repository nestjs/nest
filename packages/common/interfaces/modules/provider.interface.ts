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
  /**
   * If true, then injector returns an array of instances. This is useful to allow multiple
   * providers spread across many files to provide configuration information to a common token.
   */
  multi?: boolean | undefined;
}

export interface FactoryProvider {
  provide: any;
  useFactory: (...args: any[]) => any;
  inject?: Array<Type<any> | string | any>;
  scope?: Scope;
}
