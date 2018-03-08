import { InstanceWrapper, NestContainer } from './container';
import {
  Injectable,
  Controller,
  NestModule,
  DynamicModule,
} from '@nestjs/common/interfaces';
import { UnknownExportException } from '../errors/exceptions/unknown-export.exception';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { ModuleRef } from './module-ref';
import {
  isFunction,
  isNil,
  isUndefined,
  isString,
  isSymbol,
} from '@nestjs/common/utils/shared.utils';
import { RuntimeException } from '../errors/exceptions/runtime.exception';
import { ExternalContextCreator } from './../helpers/external-context-creator';
import { GuardsContextCreator } from './../guards/guards-context-creator';
import { InterceptorsContextCreator } from './../interceptors/interceptors-context-creator';
import { InterceptorsConsumer } from './../interceptors/interceptors-consumer';
import { GuardsConsumer } from './../guards/guards-consumer';
import { ModulesContainer } from './modules-container';
import { Reflector } from '../services/reflector.service';
import { HTTP_SERVER_REF } from './tokens';

export interface CustomComponent {
  provide: any;
  name: string;
}
export type OpaqueToken = string | symbol | object | Type<any>;
export type CustomClass = CustomComponent & { useClass: Type<any> };
export type CustomFactory = CustomComponent & {
  useFactory: (...args) => any;
  inject?: OpaqueToken[];
};
export type CustomValue = CustomComponent & { useValue: any };
export type ComponentMetatype =
  | Type<Injectable>
  | CustomFactory
  | CustomValue
  | CustomClass;

export class Module {
  private _relatedModules = new Set<Module>();
  private _components = new Map<any, InstanceWrapper<Injectable>>();
  private _injectables = new Map<any, InstanceWrapper<Injectable>>();
  private _routes = new Map<string, InstanceWrapper<Controller>>();
  private _exports = new Set<string>();

  constructor(
    private _metatype: Type<any>,
    private _scope: Type<any>[],
    container: NestContainer,
  ) {
    this.addCoreInjectables(container);
  }

  get scope(): Type<any>[] {
    return this._scope;
  }

  get relatedModules(): Set<Module> {
    return this._relatedModules;
  }

  get components(): Map<string, InstanceWrapper<Injectable>> {
    return this._components;
  }

  get injectables(): Map<string, InstanceWrapper<Injectable>> {
    return this._injectables;
  }

  get routes(): Map<string, InstanceWrapper<Controller>> {
    return this._routes;
  }

  get exports(): Set<string> {
    return this._exports;
  }

  get instance(): NestModule {
    if (!this._components.has(this._metatype.name)) {
      throw new RuntimeException();
    }
    const module = this._components.get(this._metatype.name);
    return module.instance as NestModule;
  }

  get metatype(): Type<any> {
    return this._metatype;
  }

  public addCoreInjectables(container: NestContainer) {
    this.addModuleRef();
    this.addModuleAsComponent();
    this.addReflector();
    this.addApplicationRef(container.getApplicationRef());
    this.addExternalContextCreator(container);
    this.addModulesContainer(container);
  }

  public addModuleRef() {
    const moduleRef = this.createModuleRefMetatype(this._components);
    this._components.set(ModuleRef.name, {
      name: ModuleRef.name,
      metatype: ModuleRef as any,
      isResolved: true,
      instance: new moduleRef(),
    });
  }

  public addModuleAsComponent() {
    this._components.set(this._metatype.name, {
      name: this._metatype.name,
      metatype: this._metatype,
      isResolved: false,
      instance: null,
    });
  }

  public addReflector() {
    this._components.set(Reflector.name, {
      name: Reflector.name,
      metatype: Reflector,
      isResolved: false,
      instance: null,
    });
  }

  public addApplicationRef(applicationRef: any) {
    this._components.set(HTTP_SERVER_REF, {
      name: HTTP_SERVER_REF,
      metatype: {} as any,
      isResolved: true,
      instance: applicationRef,
    });
  }

  public addExternalContextCreator(container: NestContainer) {
    this._components.set(ExternalContextCreator.name, {
      name: ExternalContextCreator.name,
      metatype: ExternalContextCreator,
      isResolved: true,
      instance: new ExternalContextCreator(
        new GuardsContextCreator(container),
        new GuardsConsumer(),
        new InterceptorsContextCreator(container),
        new InterceptorsConsumer(),
        container.getModules(),
      ),
    });
  }

  public addModulesContainer(container: NestContainer) {
    this._components.set(ModulesContainer.name, {
      name: ModulesContainer.name,
      metatype: ModulesContainer,
      isResolved: true,
      instance: container.getModules(),
    });
  }

  public addInjectable(injectable: Type<Injectable>) {
    if (this.isCustomProvider(injectable)) {
      return this.addCustomProvider(injectable, this._injectables);
    }
    this._injectables.set(injectable.name, {
      name: injectable.name,
      metatype: injectable,
      instance: null,
      isResolved: false,
    });
  }

  public addComponent(component: ComponentMetatype): string {
    if (this.isCustomProvider(component)) {
      return this.addCustomProvider(component, this._components);
    }
    this._components.set((component as Type<Injectable>).name, {
      name: (component as Type<Injectable>).name,
      metatype: component as Type<Injectable>,
      instance: null,
      isResolved: false,
    });
    return (component as Type<Injectable>).name;
  }

  public isCustomProvider(
    component: ComponentMetatype,
  ): component is CustomClass | CustomFactory | CustomValue {
    return !isNil((component as CustomComponent).provide);
  }

  public addCustomProvider(
    component: CustomFactory | CustomValue | CustomClass,
    collection: Map<string, any>,
  ): string {
    const { provide } = component;
    const name = isFunction(provide) ? provide.name : provide;
    const comp = {
      ...component,
      name,
    };

    if (this.isCustomClass(comp)) this.addCustomClass(comp, collection);
    else if (this.isCustomValue(comp)) this.addCustomValue(comp, collection);
    else if (this.isCustomFactory(comp))
      this.addCustomFactory(comp, collection);

    return name;
  }

  public isCustomClass(component): component is CustomClass {
    return !isUndefined((component as CustomClass).useClass);
  }

  public isCustomValue(component): component is CustomValue {
    return !isUndefined((component as CustomValue).useValue);
  }

  public isCustomFactory(component): component is CustomFactory {
    return !isUndefined((component as CustomFactory).useFactory);
  }

  public isDynamicModule(exported): exported is DynamicModule {
    return exported && exported.module;
  }

  public addCustomClass(component: CustomClass, collection: Map<string, any>) {
    const { provide, name, useClass } = component;
    collection.set(name, {
      name,
      metatype: useClass,
      instance: null,
      isResolved: false,
    });
  }

  public addCustomValue(component: CustomValue, collection: Map<string, any>) {
    const { provide, name, useValue: value } = component;
    collection.set(name, {
      name,
      metatype: null,
      instance: value,
      isResolved: true,
      isNotMetatype: true,
      async: value instanceof Promise,
    });
  }

  public addCustomFactory(
    component: CustomFactory,
    collection: Map<string, any>,
  ) {
    const { provide, name, useFactory: factory, inject } = component;
    collection.set(name, {
      name,
      metatype: factory as any,
      instance: null,
      isResolved: false,
      inject: inject || [],
      isNotMetatype: true,
    });
  }

  public addExportedComponent(
    exportedComponent: ComponentMetatype | string | DynamicModule,
  ) {
    if (this.isCustomProvider(exportedComponent as any)) {
      return this.addCustomExportedComponent(exportedComponent as any);
    }
    else if (isString(exportedComponent)) {
      return this._exports.add(exportedComponent);
    }
    else if (this.isDynamicModule(exportedComponent)) {
      const { module } = exportedComponent;
      return this._exports.add(module.name);
    }
    this._exports.add(exportedComponent.name);
  }

  public addCustomExportedComponent(
    exportedComponent: CustomFactory | CustomValue | CustomClass,
  ) {
    const provide = exportedComponent.provide;
    if (isString(provide) || isSymbol(provide)) {
      return this._exports.add(provide);
    }
    this._exports.add(provide.name);
  }

  public addRoute(route: Type<Controller>) {
    this._routes.set(route.name, {
      name: route.name,
      metatype: route,
      instance: null,
      isResolved: false,
    });
  }

  public addRelatedModule(relatedModule) {
    this._relatedModules.add(relatedModule);
  }

  public replace(toReplace, options) {
    if (options.isComponent) {
      return this.addComponent({ provide: toReplace, ...options });
    }
    this.addInjectable({
      provide: toReplace,
      ...options,
    });
  }

  public createModuleRefMetatype(components) {
    return class {
      public readonly components = components;

      public get<T>(type: OpaqueToken): T {
        const name = isFunction(type) ? (type as Type<any>).name : type;
        const exists = this.components.has(name);

        return exists ? (this.components.get(name).instance as T) : null;
      }
    };
  }
}
