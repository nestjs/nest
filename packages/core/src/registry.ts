import {
  CircularDependencyException,
  InvalidProviderException,
} from './errors';
import { InjectionToken } from './module';
import { Reflector } from './reflector';
import { Utils } from './util';
import {
  ProvideToken,
  ILazyInject,
  ForwardRef,
  Provider,
  Type,
  FactoryProvider,
  ValueProvider,
  ClassProvider,
  ExistingProvider,
  DynamicModule,
  ModuleImport,
  Token,
  ModuleExport,
} from './interfaces';

export class Registry {
  public static readonly lazyInjects = new Set<ILazyInject>();

  public static clearLazyInjects() {
    this.lazyInjects.clear();
  }

  public static getLazyInjects(target: Type<Provider>): ILazyInject[] {
    return [...this.lazyInjects.values()].filter(
      provider => provider.target === target,
    );
  }

  public static isModule(target: any) {
    return (
      this.isDynamicModule(target) ||
      (!this.hasProvideToken(target) &&
        !Reflector.isProvider(target) &&
        !this.isInjectionToken(target))
    );
  }

  public static hasForwardRef(provider: any) {
    return provider && (<ForwardRef>provider).forwardRef;
  }

  public static getForwardRef(provider: ModuleImport) {
    return Registry.hasForwardRef(provider)
      ? (<ForwardRef>provider).forwardRef()
      : provider;
  }

  public static getProviderName(provider: Provider) {
    const token = this.getProviderToken(provider);

    return Utils.isSymbol(token) ? token.toString() : token.name;
  }

  public static isInjectionToken(
    provider: any,
  ): provider is InjectionToken<any> {
    return provider instanceof InjectionToken;
  }

  public static getInjectionToken(provider: any): Token {
    return this.isInjectionToken(provider)
      ? (<InjectionToken<any>>provider).name
      : <Type<any>>provider;
  }

  public static assertProvider(
    val: any,
    context?: string,
  ): Type<any> | InjectionToken<any> {
    if (!val) throw new CircularDependencyException(context!);

    if (
      !(
        Utils.isObject(val) ||
        (!Utils.isNil(val.name) &&
          (Utils.isFunction(val) || Utils.isFunction(val.constructor)))
      )
    ) {
      throw new InvalidProviderException(val);
    }

    return val;
  }

  public static getProviderToken(provider: ModuleImport | ModuleExport): Token {
    return this.getInjectionToken((<ProvideToken>provider).provide || provider);
  }

  public static isDynamicModule(module: any): module is DynamicModule {
    return !!(<DynamicModule>module).module;
  }

  public static isFactoryProvider(
    provider: Provider,
  ): provider is FactoryProvider<any> {
    return !!(<FactoryProvider<any>>provider).useFactory;
  }

  public static isValueProvider(
    provider: Provider,
  ): provider is ValueProvider<any> {
    return !!(<ValueProvider<any>>provider).useValue;
  }

  public static isClassProvider(provider: Provider): provider is ClassProvider {
    return !!(<ClassProvider>provider).useClass;
  }

  public static isExistingProvider(
    provider: Provider,
  ): provider is ExistingProvider<any> {
    return !!(<ExistingProvider<any>>provider).useExisting;
  }

  public static hasProvideToken(provider: Provider): provider is ProvideToken {
    return !!(<ProvideToken>provider).provide;
  }
}
