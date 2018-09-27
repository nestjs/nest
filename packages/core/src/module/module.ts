import { Container } from 'inversify';
import getDecorators from 'inversify-inject-decorators';

import { PROVIDER_TYPES, SCOPES } from '../constants';
import { NestContainer } from './container';
import { Reflector } from '../reflector';
import { Registry } from '../registry';
import { Utils } from '../util';
import {
  ClassProvider,
  FactoryProvider,
  ModuleExport,
  ModuleImport,
  OnModuleInit,
  Provider,
  Type,
  Token,
  ValueProvider,
  Dependency,
  MultiDepsProvider,
  ExistingProvider,
} from '../interfaces';
import { MODULE_INIT, Injector, NEST_MODULE } from '../tokens';
import {
  UnknownProviderException,
  MultiProviderException,
  UnknownExportException,
} from '../errors';

export class NestModule {
  public readonly imports = new Set<NestModule>();
  public readonly injectables = new Set<Provider>();
  public readonly providers = new Container();
  public readonly lazyInject = getDecorators(this.providers).lazyInject;
  public readonly exports = new Set<Token>();
  public readonly created = Utils.createDeferredPromise();

  constructor(
    public readonly target: Type<any>,
    public readonly scope: Type<any>[],
    public readonly container: NestContainer,
  ) {}

  public addImport(relatedModule: NestModule) {
    this.imports.add(relatedModule);
  }

  public addProvider(provider: Provider) {
    this.injectables.add(provider);
  }

  private providerContainerHasToken(token: Token) {
    return [...this.injectables.values()].some(
      provider => Registry.getProviderToken(provider) === token,
    );
  }

  private validateExported(token: Token, exported: ModuleExport) {
    if (this.providerContainerHasToken(token)) return token;

    const imported = [...this.imports.values()];
    const importedRefNames = <any[]>imported
      .filter(item => item)
      .map(({ target }) => target)
      .filter(target => target);

    if (!importedRefNames.includes(token)) {
      throw new UnknownExportException(
        this.target.name,
        (<Type<any>>exported).name,
      );
    }

    return token;
  }

  public addExported(exported: ModuleExport) {
    const addExportedUnit = (token: Token) => {
      this.exports.add(this.validateExported(token, exported));
    };

    if (Registry.isDynamicModule(exported)) {
      return addExportedUnit(exported.module);
    }

    addExportedUnit(Registry.getProviderToken(exported));
  }

  public getProviders() {
    return [
      ...this.injectables.values(),
      ...this.getRelatedProviders().values(),
    ];
  }

  private linkRelatedProviders() {
    const providers = this.getRelatedProviders();

    providers.forEach(provider => {
      const ref = this.container.getProvider(provider, this.target);

      this.providers.bind(<any>provider).toConstantValue(ref);
    });
  }

  private getRelatedProviders() {
    const providerScope = new Set<Token>();

    const find = (module: NestModule | Dependency) => {
      module = <any>Registry.getForwardRef(<Dependency>module);

      if (Reflector.isProvider(<any>module)) {
        providerScope.add(<Token>module);
      } else {
        for (const related of (<NestModule>module).exports) {
          if (this.container.hasModule(<Type<NestModule>>related)) {
            const ref = this.container.getModule(<Type<NestModule>>related);
            find(ref!);
          } else {
            providerScope.add(<Token>related);
          }
        }
      }
    };

    for (const related of this.imports) {
      find(related);
    }

    return providerScope;
  }

  private async bindProviders() {
    this.linkRelatedProviders();

    for (const provider of this.injectables) {
      const isMulti = (<MultiDepsProvider>provider).multi;
      const token = Registry.getProviderToken(provider);

      // @TODO: Fix multi providers properly
      if (!isMulti && this.container.providerTokens.includes(token)) {
        const name = Registry.getProviderName(provider);
        throw new MultiProviderException(name);
      }

      this.container.providerTokens.push(token);
      const type = this.getProviderType(provider);
      await this.bind(token, type, provider);
    }
  }

  public replace(toReplace: Dependency, options: any) {
    this.addProvider({
      provide: toReplace,
      ...options,
    });
  }

  public async create() {
    if (this.providers.isBound(this.target)) return;

    this.providers.bind(this.target).toSelf();
    const module = this.providers.get<Type<NestModule>>(this.target);

    await this.bindProviders();

    (<OnModuleInit>module).onModuleInit &&
      (await (<OnModuleInit>module).onModuleInit());

    await Utils.series(
      this.container.getAllProviders<Promise<any>>(MODULE_INIT, this.target),
    );

    this.created.resolve();
    console.log(this.target.name, 'created');
  }

  private getProviderType(provider: Provider) {
    if (Registry.isFactoryProvider(provider)) {
      return PROVIDER_TYPES.FACTORY;
    } else if (Registry.isValueProvider(provider)) {
      return PROVIDER_TYPES.VALUE;
    } else if (Registry.isClassProvider(provider)) {
      return PROVIDER_TYPES.CLASS;
    } else if (Registry.isExistingProvider(provider)) {
      return PROVIDER_TYPES.EXISTING;
    }

    return PROVIDER_TYPES.DEFAULT;
  }

  public getProvider(ref: ModuleImport): Token {
    const token = Registry.getProviderToken(<Provider>ref);
    const provider = <any>(
      this.getProviders().find(provider => provider === token)
    );
    if (!provider) throw new UnknownProviderException(<any>ref, this.target);
    return provider;
  }

  private async getDependencies(dependencies: ModuleImport[]) {
    return await Promise.all(
      dependencies.map(dependency => {
        const ref = Registry.getForwardRef(dependency);
        Registry.assertProvider(ref);

        const provider = this.getProvider(<any>ref);
        return this.container.getProvider(provider, this.target);
      }),
    );
  }

  private async bindFactoryProvider(
    token: Token,
    provider: FactoryProvider<any>,
  ) {
    const deps = await this.getDependencies(provider.deps);

    // const factory = await provider.useFactory(...deps);
    if (provider.scope === SCOPES.TRANSIENT) {
      return this.providers
        .bind(token)
        .toDynamicValue(() => <any>provider.useFactory(...deps));
    }

    return this.providers
      .bind(token)
      .toProvider(() => <any>provider.useFactory(...deps));
  }

  private bindProvider(scope: string, provider: Type<Provider>) {
    const binding = this.providers.bind(provider).toSelf();

    switch (scope) {
      case SCOPES.TRANSIENT:
        return binding.inTransientScope();

      case SCOPES.REQUEST:
        return binding.inRequestScope();

      case SCOPES.SINGLETON:
      default:
        return binding.inSingletonScope();
    }
  }

  private bindClassProvider(token: Token, provider: ClassProvider) {
    return this.providers.bind(token).to(provider.useClass);
  }

  private bindValueProvider(token: Token, provider: ValueProvider<any>) {
    return this.providers.bind(token).toConstantValue(provider.useValue);
  }

  private bindExistingProvider(token: Token, provider: ExistingProvider<any>) {
    const existingToken = Registry.getInjectionToken(provider.useExisting);
    const existing = this.providers.get(existingToken);
    return this.providers.bind(token).toConstantValue(existing);
  }

  public async bind(token: Token, type: string, provider: Provider) {
    if (type === PROVIDER_TYPES.DEFAULT) {
      const scope = Reflector.resolveProviderScope(<Type<Provider>>provider);
      const lazyInjects = Registry.getLazyInjects(<Type<Provider>>provider);
      lazyInjects.forEach(({ lazyInject, forwardRef }) => {
        const token = Registry.getForwardRef(forwardRef);
        lazyInject(this.lazyInject, <Token>token);
      });
      this.bindProvider(scope, <Type<Provider>>provider);
    } else if (type === PROVIDER_TYPES.FACTORY) {
      await this.bindFactoryProvider(token, <FactoryProvider<any>>provider);
    } else if (type === PROVIDER_TYPES.VALUE) {
      this.bindValueProvider(token, <ValueProvider<any>>provider);
    } else if (type === PROVIDER_TYPES.CLASS) {
      this.bindClassProvider(token, <ClassProvider>provider);
    } else if (type === PROVIDER_TYPES.EXISTING) {
      // @TODO: Test useExisting binding
      this.bindExistingProvider(token, <ExistingProvider<any>>provider);
    }
  }

  public addGlobalProviders() {
    this.providers.bind(Injector).toConstantValue(this.providers);
    this.providers.bind(NestContainer).toConstantValue(this.container);
    this.providers.bind(NEST_MODULE.name).toConstantValue(this);

    this.providers
      .bind(Injector)
      .toConstantValue(this.providers)
      .whenInjectedInto(this.target);

    this.providers
      .bind(NestContainer)
      .toConstantValue(this.container)
      .whenInjectedInto(this.target);
  }
}
