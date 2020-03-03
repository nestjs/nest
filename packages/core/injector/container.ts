import { DynamicModule, Provider } from '@nestjs/common';
import { GLOBAL_MODULE_METADATA } from '@nestjs/common/constants';
import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { ApplicationConfig } from '../application-config';
import { CircularDependencyException } from '../errors/exceptions/circular-dependency.exception';
import { InvalidModuleException } from '../errors/exceptions/invalid-module.exception';
import { UnknownModuleException } from '../errors/exceptions/unknown-module.exception';
import { ExternalContextCreator } from '../helpers/external-context-creator';
import { HttpAdapterHost } from '../helpers/http-adapter-host';
import { REQUEST } from '../router/request/request-constants';
import { ModuleCompiler } from './compiler';
import { ContextId } from './instance-wrapper';
import { InternalCoreModule } from './internal-core-module';
import { InternalProvidersStorage } from './internal-providers-storage';
import { Module } from './module';
import { ModuleTokenFactory } from './module-token-factory';
import { ModulesContainer } from './modules-container';

export class NestContainer {
  private readonly globalModules = new Set<Module>();
  private readonly moduleTokenFactory = new ModuleTokenFactory();
  private readonly moduleCompiler = new ModuleCompiler(this.moduleTokenFactory);
  private readonly modules = new ModulesContainer();
  private readonly dynamicModulesMetadata = new Map<
    string,
    Partial<DynamicModule>
  >();
  private readonly internalProvidersStorage = new InternalProvidersStorage();
  private internalCoreModule: Module;

  constructor(
    private readonly _applicationConfig: ApplicationConfig = undefined,
  ) {}

  get applicationConfig(): ApplicationConfig | undefined {
    return this._applicationConfig;
  }

  public setHttpAdapter(httpAdapter: any) {
    this.internalProvidersStorage.httpAdapter = httpAdapter;

    if (!this.internalProvidersStorage.httpAdapterHost) {
      return;
    }
    const host = this.internalProvidersStorage.httpAdapterHost;
    host.httpAdapter = httpAdapter;
  }

  public getHttpAdapterRef() {
    return this.internalProvidersStorage.httpAdapter;
  }

  public async addModule(
    metatype: Type<any> | DynamicModule | Promise<DynamicModule>,
    scope: Type<any>[],
  ): Promise<Module> {
    if (!metatype) {
      throw new InvalidModuleException(scope);
    }
    const { type, dynamicMetadata, token } = await this.moduleCompiler.compile(
      metatype,
      scope,
    );
    if (this.modules.has(token)) {
      return;
    }
    const module = new Module(type, scope, this);
    this.modules.set(token, module);
    this.addDynamicMetadata(token, dynamicMetadata, [].concat(scope, type));

    if (this.isGlobalModule(type, dynamicMetadata)) {
      this.addGlobalModule(module);
    }
    return module;
  }

  public addDynamicMetadata(
    token: string,
    dynamicModuleMetadata: Partial<DynamicModule>,
    scope: Type<any>[],
  ): void {
    if (!dynamicModuleMetadata) {
      return;
    }
    this.dynamicModulesMetadata.set(token, dynamicModuleMetadata);

    const { imports } = dynamicModuleMetadata;
    this.addDynamicModules(imports, scope);
  }

  public addDynamicModules(modules: any[], scope: Type<any>[]) {
    if (!modules) {
      return;
    }
    modules.forEach(module => this.addModule(module, scope));
  }

  public isGlobalModule(
    metatype: Type<any>,
    dynamicMetadata?: Partial<DynamicModule>,
  ): boolean {
    if (dynamicMetadata && dynamicMetadata.global) {
      return true;
    }
    return !!Reflect.getMetadata(GLOBAL_MODULE_METADATA, metatype);
  }

  public addGlobalModule(module: Module) {
    this.globalModules.add(module);
  }

  public getModules(): ModulesContainer {
    return this.modules;
  }

  public getModuleByKey(moduleKey: string): Module {
    return this.modules.get(moduleKey);
  }

  public getInternalCoreModuleRef(): Module | undefined {
    return this.internalCoreModule;
  }

  public async addImport(
    relatedModule: Type<any> | DynamicModule,
    token: string,
  ) {
    if (!this.modules.has(token)) {
      return;
    }
    const module = this.modules.get(token);
    const parent = module.metatype;

    const scope = [].concat(module.scope, parent);
    const { token: relatedModuleToken } = await this.moduleCompiler.compile(
      relatedModule,
      scope,
    );
    const related = this.modules.get(relatedModuleToken);
    module.addRelatedModule(related);
  }

  public addProvider(provider: Provider, token: string): string {
    if (!provider) {
      throw new CircularDependencyException();
    }
    if (!this.modules.has(token)) {
      throw new UnknownModuleException();
    }
    const module = this.modules.get(token);
    return module.addProvider(provider);
  }

  public addInjectable(
    injectable: Provider,
    token: string,
    host?: Type<Injectable>,
  ) {
    if (!this.modules.has(token)) {
      throw new UnknownModuleException();
    }
    const module = this.modules.get(token);
    module.addInjectable(injectable, host);
  }

  public addExportedProvider(provider: Type<any>, token: string) {
    if (!this.modules.has(token)) {
      throw new UnknownModuleException();
    }
    const module = this.modules.get(token);
    module.addExportedProvider(provider);
  }

  public addController(controller: Type<any>, token: string) {
    if (!this.modules.has(token)) {
      throw new UnknownModuleException();
    }
    const module = this.modules.get(token);
    module.addController(controller);
  }

  public clear() {
    this.modules.clear();
  }

  public replace(toReplace: any, options: any & { scope: any[] | null }) {
    this.modules.forEach(module => module.replace(toReplace, options));
  }

  public bindGlobalScope() {
    this.modules.forEach(module => this.bindGlobalsToImports(module));
  }

  public bindGlobalsToImports(module: Module) {
    this.globalModules.forEach(globalModule =>
      this.bindGlobalModuleToModule(module, globalModule),
    );
  }

  public bindGlobalModuleToModule(target: Module, globalModule: Module) {
    if (target === globalModule) {
      return;
    }
    target.addRelatedModule(globalModule);
  }

  public getDynamicMetadataByToken(
    token: string,
    metadataKey: keyof DynamicModule,
  ): any[] {
    const metadata = this.dynamicModulesMetadata.get(token);
    if (metadata && metadata[metadataKey]) {
      return metadata[metadataKey] as any[];
    }
    return [];
  }

  public createCoreModule(): DynamicModule {
    return InternalCoreModule.register([
      {
        provide: ExternalContextCreator,
        useValue: ExternalContextCreator.fromContainer(this),
      },
      {
        provide: ModulesContainer,
        useValue: this.modules,
      },
      {
        provide: HttpAdapterHost,
        useValue: this.internalProvidersStorage.httpAdapterHost,
      },
    ]);
  }

  public registerCoreModuleRef(moduleRef: Module) {
    this.internalCoreModule = moduleRef;
    this.modules[InternalCoreModule.name] = moduleRef;
  }

  public getModuleTokenFactory(): ModuleTokenFactory {
    return this.moduleTokenFactory;
  }

  public registerRequestProvider<T = any>(request: T, contextId: ContextId) {
    const wrapper = this.internalCoreModule.getProviderByKey(REQUEST);
    wrapper.setInstanceByContextId(contextId, {
      instance: request,
      isResolved: true,
    });
  }
}
