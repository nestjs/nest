import { InjectionToken } from './injection-token';
import { ModuleCompiler } from './compiler';
import { Reflector } from '../reflector';
import { Registry } from '../registry';
import { NestModule } from './module';
import { Utils } from '../util';
import {
  UnknownModuleException,
  InvalidModuleException,
  UnknownProviderException,
  MissingInjectionTokenException,
} from '../errors';
import {
  Dependency,
  DynamicModule,
  ModuleExport,
  ModuleImport,
  Provider,
  Token,
  Type,
} from '../interfaces';

export interface StrictSelect {
  strict?: boolean;
}

export class NestContainer {
  private readonly moduleCompiler = new ModuleCompiler();
  private readonly globalModules = new Set<NestModule>();
  private readonly modules = new Map<string, NestModule>();
  public readonly providerTokens: Token[] = [];
  private readonly dynamicModulesMetadata = new Map<
    string,
    Partial<DynamicModule>
  >();

  private getModules(module?: Type<NestModule>) {
    return !Utils.isNil(module)
      ? [this.getModule(module)]
      : this.getModuleValues();
  }

  public isProviderBound(provider: Token, module?: Type<NestModule>) {
    return this.getModuleValues().some(({ providers }) =>
      providers.isBound(provider),
    );
  }

  public replace(
    toReplace: Dependency,
    options: any & { scope: any[] | null },
  ) {
    [...this.modules.values()].forEach(module => {
      module.replace(toReplace, options);
    });
  }

  public getProvider<T>(
    provider: Type<T> | InjectionToken<T>,
    scope: Type<NestModule>,
    { strict }: StrictSelect = {},
  ): T {
    const token = Registry.getProviderToken(provider);

    if (strict) {
      const module = this.getModule(scope);
      return module.providers.get(token);
    }

    for (const { providers } of this.modules.values()) {
      if (providers.isBound(token)) {
        return providers.get<T>(token);
      }
    }

    throw new UnknownProviderException(<any>provider, scope);
  }

  public getAllProviders<T>(
    provider: InjectionToken<T>,
    target?: Type<NestModule>,
  ) {
    if (!Registry.isInjectionToken(provider)) {
      throw new MissingInjectionTokenException('Container.getAllProviders()');
    }

    const token = Registry.getProviderToken(provider);
    const modules = this.getModuleValues();

    return Utils.flatten<T | Promise<Type<Provider>>>(
      Utils.filterWhen<NestModule>(
        modules,
        !!target,
        module => module.target === target,
      ).map(
        ({ providers }) =>
          providers.isBound(token) ? providers.getAll(token) : [],
      ),
    );
  }

  public getModuleValues() {
    return Utils.getValues<NestModule>(this.modules.entries());
  }

  public hasModule(module: Type<any>) {
    return this.getModuleValues().some(({ target }) => target === module);
  }

  public getModule(module: Type<any>): NestModule | undefined {
    return this.getModuleValues().find(({ target }) => target === module);
  }

  public getModuleByToken(token: string) {
    if (!this.modules.has(token)) {
      throw new UnknownModuleException([]);
    }

    return <NestModule>this.modules.get(token);
  }

  public getReversedModules() {
    return [...this.modules.entries()].reverse();
  }

  public getModules() {
    return this.modules;
  }

  public async addProvider(provider: Provider, token: string) {
    const module = this.getModuleByToken(token);
    await module.addProvider(provider);
  }

  public addExported(component: ModuleExport, token: string) {
    const module = this.getModuleByToken(token);
    module.addExported(component);
  }

  public addGlobalModule(module: NestModule) {
    this.globalModules.add(module);
  }

  public async addModule(
    module: Partial<ModuleImport>,
    scope: Type<NestModule>[],
  ) {
    if (!module) throw new InvalidModuleException(scope);

    const {
      target,
      dynamicMetadata,
      token,
    } = await this.moduleCompiler.compile(module, scope);
    if (this.modules.has(token)) return;

    const nestModule = new NestModule(target, scope, this);
    nestModule.addGlobalProviders();
    this.modules.set(token, nestModule);

    const modules = Utils.concat(scope, target);
    this.addDynamicMetadata(token, dynamicMetadata!, modules);
    Reflector.isGlobalModule(target) && this.addGlobalModule(nestModule);
  }

  private addDynamicMetadata(
    token: string,
    dynamicModuleMetadata: Partial<DynamicModule>,
    scope: Type<NestModule>[],
  ) {
    if (!dynamicModuleMetadata) return;

    this.dynamicModulesMetadata.set(token, dynamicModuleMetadata);
    this.addDynamicModules(dynamicModuleMetadata.imports, scope);
  }

  private addDynamicModules(
    modules: ModuleImport[] = [],
    scope: Type<NestModule>[],
  ) {
    modules.forEach(module => this.addModule(module, scope));
  }

  public bindGlobalScope() {
    this.modules.forEach(module => this.bindGlobalsToImports(module));
  }

  private bindGlobalsToImports(module: NestModule) {
    this.globalModules.forEach(globalModule =>
      this.bindGlobalModuleToModule(module, globalModule),
    );
  }

  private bindGlobalModuleToModule(
    module: NestModule,
    globalModule: NestModule,
  ) {
    if (module === globalModule) return;
    module.addImport(globalModule);
  }

  public async addImport(relatedModule: ModuleImport, token: string) {
    if (!this.modules.has(token)) return;

    const module = this.getModuleByToken(token);
    const scope = Utils.concat(module.scope, module.target);

    const { token: relatedModuleToken } = await this.moduleCompiler.compile(
      relatedModule,
      scope,
    );

    const related = this.getModuleByToken(relatedModuleToken);
    module.addImport(related);
  }

  public getDynamicMetadataByToken(token: string, key: keyof DynamicModule) {
    const metadata = this.dynamicModulesMetadata.get(token);
    return metadata && metadata[key] ? metadata[key] : [];
  }
}
