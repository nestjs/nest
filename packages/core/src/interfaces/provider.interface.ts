import { InjectionToken } from '../module';
import { Type } from './type.interface';
import { Dependency } from './module';

export type Provider =
  | ProvideToken
  | ValueProvider<any>
  | FactoryProvider<any>
  | ExistingProvider<any>
  | ClassProvider
  | Dependency;

export interface ClassProvider extends ProvideToken {
  useClass: Type<any>;
}

export interface ProvideToken {
  provide: InjectionToken<any> | Type<any>;
}

export interface DepsProvider {
  deps: Dependency[];
}

export interface MultiDepsProvider extends DepsProvider {
  multi?: boolean;
}

export interface ExistingProvider<T> {
  useExisting: Type<T> | InjectionToken<T>;
}

export interface ValueProvider<T> extends ProvideToken {
  useValue: T;
}

export interface FactoryProvider<T> extends ProvideToken, MultiDepsProvider {
  useFactory: (...args: any[]) => T | Promise<T>;
  scope?: string;
}
