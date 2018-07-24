import { DynamicModule } from '@nestjs/common';
import { GLOBAL_MODULE_METADATA } from '@nestjs/common/constants';
import { Type } from '@nestjs/common/interfaces/type.interface';
import 'reflect-metadata';
import { ApplicationConfig } from '../application-config';
import { InvalidModuleException } from '../errors/exceptions/invalid-module.exception';
import { UnknownModuleException } from '../errors/exceptions/unknown-module.exception';
import { ModuleCompiler } from './compiler';
import { Module } from './module';
import { ModulesContainer } from './modules-container';

export class NestContainer {
  private readonly globalModules = new Set<Module>();
  private readonly moduleCompiler = new ModuleCompiler();
  private readonly modules = new ModulesContainer();
  private readonly dynamicModulesMetadata = new Map<
    string,
    Partial<DynamicModule>
  >();
  private applicationRef: any;

  constructor(
    private readonly _applicationConfig: ApplicationConfig = void 0,
  ) {}

  get applicationConfig(): ApplicationConfig | undefined {
    return this._applicationConfig;
  }

  public setApplicationRef(applicationRef: any) {
    this.applicationRef = applicationRef;
  }

  public getApplicationRef() {
    return this.applicationRef;
  }

  public async addModule(
    metatype: Type<any> | DynamicModule | Promise<DynamicModule>,
    scope: Type<any>[],
  ) {
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
    this.isGlobalModule(type) && this.addGlobalModule(module);
  }

  public addDynamicMetadata(
    token: string,
    dynamicModuleMetadata: Partial<DynamicModule>,
    scope: Type<any>[],
  ) {
    if (!dynamicModuleMetadata) {
      return undefined;
    }
    this.dynamicModulesMetadata.set(token, dynamicModuleMetadata);

    const { modules, imports } = dynamicModuleMetadata;
    this.addDynamicModules(modules, scope);
    this.addDynamicModules(imports, scope);
  }

  public addDynamicModules(modules: any[], scope: Type<any>[]) {
    if (!modules) {
      return undefined;
    }
    modules.map(module => this.addModule(module, scope));
  }

  public isGlobalModule(metatype: Type<any>): boolean {
    return !!Reflect.getMetadata(GLOBAL_MODULE_METADATA, metatype);
  }

  public addGlobalModule(module: Module) {
    this.globalModules.add(module);
  }

  public getModules(): ModulesContainer {
    return this.modules;
  }

  public async addRelatedModule(
    relatedModule: Type<any> | DynamicModule,
    token: string,
  ) {
    if (!this.modules.has(token)) return;

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

  public addComponent(component: Type<any>, token: string): string {
    if (!this.modules.has(token)) {
      throw new UnknownModuleException();
    }
    const module = this.modules.get(token);
    return module.addComponent(component);
  }

  public addInjectable(injectable: Type<any>, token: string) {
    if (!this.modules.has(token)) {
      throw new UnknownModuleException();
    }
    const module = this.modules.get(token);
    module.addInjectable(injectable);
  }

  public addExportedComponent(exportedComponent: Type<any>, token: string) {
    if (!this.modules.has(token)) {
      throw new UnknownModuleException();
    }
    const module = this.modules.get(token);
    module.addExportedComponent(exportedComponent);
  }

  public addController(controller: Type<any>, token: string) {
    if (!this.modules.has(token)) {
      throw new UnknownModuleException();
    }
    const module = this.modules.get(token);
    module.addRoute(controller);
  }

  public clear() {
    this.modules.clear();
  }

  public replace(toReplace, options: any & { scope: any[] | null }) {
    [...this.modules.values()].forEach(module => {
      module.replace(toReplace, options);
    });
  }

  public bindGlobalScope() {
    this.modules.forEach(module => this.bindGlobalsToRelatedModules(module));
  }

  public bindGlobalsToRelatedModules(module: Module) {
    this.globalModules.forEach(globalModule =>
      this.bindGlobalModuleToModule(module, globalModule),
    );
  }

  public bindGlobalModuleToModule(module: Module, globalModule: Module) {
    if (module === globalModule) {
      return undefined;
    }
    module.addRelatedModule(globalModule);
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
}

export interface InstanceWrapper<T> {
  name: any;
  metatype: Type<T>;
  instance: T;
  isResolved: boolean;
  isPending?: boolean;
  done$?: Promise<void>;
  inject?: Type<any>[];
  isNotMetatype?: boolean;
  forwardRef?: boolean;
  async?: boolean;
}
