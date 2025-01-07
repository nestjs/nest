import { DynamicModule, Provider } from '@nestjs/common';
import {
  EnhancerSubtype,
  GLOBAL_MODULE_METADATA,
} from '@nestjs/common/constants';
import { Injectable, Type } from '@nestjs/common/interfaces';
import { NestApplicationContextOptions } from '@nestjs/common/interfaces/nest-application-context-options.interface';
import { ApplicationConfig } from '../application-config';
import { DiscoverableMetaHostCollection } from '../discovery/discoverable-meta-host-collection';
import {
  CircularDependencyException,
  UndefinedForwardRefException,
  UnknownModuleException,
} from '../errors/exceptions';
import { InitializeOnPreviewAllowlist } from '../inspector/initialize-on-preview.allowlist';
import { SerializedGraph } from '../inspector/serialized-graph';
import { REQUEST } from '../router/request/request-constants';
import { ModuleCompiler, ModuleFactory } from './compiler';
import { ContextId } from './instance-wrapper';
import { InternalCoreModule } from './internal-core-module/internal-core-module';
import { InternalProvidersStorage } from './internal-providers-storage';
import { Module } from './module';
import { ModulesContainer } from './modules-container';
import { ByReferenceModuleOpaqueKeyFactory } from './opaque-key-factory/by-reference-module-opaque-key-factory';
import { DeepHashedModuleOpaqueKeyFactory } from './opaque-key-factory/deep-hashed-module-opaque-key-factory';
import { ModuleOpaqueKeyFactory } from './opaque-key-factory/interfaces/module-opaque-key-factory.interface';

type ModuleMetatype = Type<any> | DynamicModule | Promise<DynamicModule>;
type ModuleScope = Type<any>[];

export class NestContainer {
  private readonly globalModules = new Set<Module>();
  private readonly modules = new ModulesContainer();
  private readonly dynamicModulesMetadata = new Map<
    string,
    Partial<DynamicModule>
  >();
  private readonly internalProvidersStorage = new InternalProvidersStorage();
  private readonly _serializedGraph = new SerializedGraph();
  private moduleCompiler: ModuleCompiler;
  private internalCoreModule: Module;

  constructor(
    private readonly _applicationConfig:
      | ApplicationConfig
      | undefined = undefined,
    private readonly _contextOptions:
      | NestApplicationContextOptions
      | undefined = undefined,
  ) {
    const moduleOpaqueKeyFactory =
      this._contextOptions?.moduleIdGeneratorAlgorithm === 'deep-hash'
        ? new DeepHashedModuleOpaqueKeyFactory()
        : new ByReferenceModuleOpaqueKeyFactory({
            keyGenerationStrategy: this._contextOptions?.snapshot
              ? 'shallow'
              : 'random',
          });
    this.moduleCompiler = new ModuleCompiler(moduleOpaqueKeyFactory);
  }

  get serializedGraph(): SerializedGraph {
    return this._serializedGraph;
  }

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

  public getHttpAdapterHostRef() {
    return this.internalProvidersStorage.httpAdapterHost;
  }

  public async addModule(
    metatype: ModuleMetatype,
    scope: ModuleScope,
  ): Promise<
    | {
        moduleRef: Module;
        inserted: boolean;
      }
    | undefined
  > {
    // In DependenciesScanner#scanForModules we already check for undefined or invalid modules
    // We still need to catch the edge-case of `forwardRef(() => undefined)`
    if (!metatype) {
      throw new UndefinedForwardRefException(scope);
    }
    const { type, dynamicMetadata, token } =
      await this.moduleCompiler.compile(metatype);
    if (this.modules.has(token)) {
      return {
        moduleRef: this.modules.get(token)!,
        inserted: true,
      };
    }

    return {
      moduleRef: await this.setModule(
        {
          token,
          type,
          dynamicMetadata,
        },
        scope,
      ),
      inserted: true,
    };
  }

  public async replaceModule(
    metatypeToReplace: ModuleMetatype,
    newMetatype: ModuleMetatype,
    scope: ModuleScope,
  ): Promise<
    | {
        moduleRef: Module;
        inserted: boolean;
      }
    | undefined
  > {
    // In DependenciesScanner#scanForModules we already check for undefined or invalid modules
    // We still need to catch the edge-case of `forwardRef(() => undefined)`
    if (!metatypeToReplace || !newMetatype) {
      throw new UndefinedForwardRefException(scope);
    }

    const { token } = await this.moduleCompiler.compile(metatypeToReplace);
    const { type, dynamicMetadata } =
      await this.moduleCompiler.compile(newMetatype);

    return {
      moduleRef: await this.setModule(
        {
          token,
          type,
          dynamicMetadata,
        },
        scope,
      ),
      inserted: false,
    };
  }

  private async setModule(
    { token, dynamicMetadata, type }: ModuleFactory,
    scope: ModuleScope,
  ): Promise<Module> {
    const moduleRef = new Module(type, this);
    moduleRef.token = token;
    moduleRef.initOnPreview = this.shouldInitOnPreview(type);
    this.modules.set(token, moduleRef);

    const updatedScope = ([] as ModuleScope).concat(scope, type);
    await this.addDynamicMetadata(token, dynamicMetadata!, updatedScope);

    if (this.isGlobalModule(type, dynamicMetadata)) {
      moduleRef.isGlobal = true;

      // Set global module distance to MAX_VALUE to ensure their lifecycle hooks
      // are always executed first (when initializing the application)
      moduleRef.distance = Number.MAX_VALUE;
      this.addGlobalModule(moduleRef);
    }

    return moduleRef;
  }

  public async addDynamicMetadata(
    token: string,
    dynamicModuleMetadata: Partial<DynamicModule>,
    scope: Type<any>[],
  ) {
    if (!dynamicModuleMetadata) {
      return;
    }
    this.dynamicModulesMetadata.set(token, dynamicModuleMetadata);

    const { imports } = dynamicModuleMetadata;
    await this.addDynamicModules(imports!, scope);
  }

  public async addDynamicModules(modules: any[], scope: Type<any>[]) {
    if (!modules) {
      return;
    }
    await Promise.all(modules.map(module => this.addModule(module, scope)));
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

  public getModuleCompiler(): ModuleCompiler {
    return this.moduleCompiler;
  }

  public getModuleByKey(moduleKey: string): Module | undefined {
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
    const moduleRef = this.modules.get(token)!;
    const { token: relatedModuleToken } =
      await this.moduleCompiler.compile(relatedModule);
    const related = this.modules.get(relatedModuleToken)!;
    moduleRef.addImport(related);
  }

  public addProvider(
    provider: Provider,
    token: string,
    enhancerSubtype?: EnhancerSubtype,
  ): string | symbol | Function {
    const moduleRef = this.modules.get(token);
    if (!provider) {
      throw new CircularDependencyException(moduleRef?.metatype.name);
    }
    if (!moduleRef) {
      throw new UnknownModuleException();
    }
    const providerKey = moduleRef.addProvider(provider, enhancerSubtype!);
    const providerRef = moduleRef.getProviderByKey(providerKey);

    DiscoverableMetaHostCollection.inspectProvider(this.modules, providerRef);

    return providerKey as Function;
  }

  public addInjectable(
    injectable: Provider,
    token: string,
    enhancerSubtype: EnhancerSubtype,
    host?: Type<Injectable>,
  ) {
    if (!this.modules.has(token)) {
      throw new UnknownModuleException();
    }
    const moduleRef = this.modules.get(token)!;
    return moduleRef.addInjectable(injectable, enhancerSubtype, host);
  }

  public addExportedProviderOrModule(
    toExport: Type<any> | DynamicModule,
    token: string,
  ) {
    if (!this.modules.has(token)) {
      throw new UnknownModuleException();
    }
    const moduleRef = this.modules.get(token)!;
    moduleRef.addExportedProviderOrModule(toExport);
  }

  public addController(controller: Type<any>, token: string) {
    if (!this.modules.has(token)) {
      throw new UnknownModuleException();
    }
    const moduleRef = this.modules.get(token)!;
    moduleRef.addController(controller);

    const controllerRef = moduleRef.controllers.get(controller)!;
    DiscoverableMetaHostCollection.inspectController(
      this.modules,
      controllerRef,
    );
  }

  public clear() {
    this.modules.clear();
  }

  public replace(toReplace: any, options: { scope: any[] | null }) {
    this.modules.forEach(moduleRef => moduleRef.replace(toReplace, options));
  }

  public bindGlobalScope() {
    this.modules.forEach(moduleRef => this.bindGlobalsToImports(moduleRef));
  }

  public bindGlobalsToImports(moduleRef: Module) {
    this.globalModules.forEach(globalModule =>
      this.bindGlobalModuleToModule(moduleRef, globalModule),
    );
  }

  public bindGlobalModuleToModule(target: Module, globalModule: Module) {
    if (target === globalModule || target === this.internalCoreModule) {
      return;
    }
    target.addImport(globalModule);
  }

  public getDynamicMetadataByToken(token: string): Partial<DynamicModule>;
  public getDynamicMetadataByToken<
    K extends Exclude<keyof DynamicModule, 'global' | 'module'>,
  >(token: string, metadataKey: K): DynamicModule[K];
  public getDynamicMetadataByToken(
    token: string,
    metadataKey?: Exclude<keyof DynamicModule, 'global' | 'module'>,
  ) {
    const metadata = this.dynamicModulesMetadata.get(token);
    return metadataKey ? (metadata?.[metadataKey] ?? []) : metadata;
  }

  public registerCoreModuleRef(moduleRef: Module) {
    this.internalCoreModule = moduleRef;
    this.modules[InternalCoreModule.name] = moduleRef;
  }

  public getModuleTokenFactory(): ModuleOpaqueKeyFactory {
    return this.moduleCompiler.moduleOpaqueKeyFactory;
  }

  public registerRequestProvider<T = any>(request: T, contextId: ContextId) {
    const wrapper = this.internalCoreModule.getProviderByKey(REQUEST);
    wrapper.setInstanceByContextId(contextId, {
      instance: request,
      isResolved: true,
    });
  }

  private shouldInitOnPreview(type: Type) {
    return InitializeOnPreviewAllowlist.has(type);
  }
}
