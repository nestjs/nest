import 'reflect-metadata';
import { InstanceWrapper } from './container';
import { UnknownDependenciesException } from '../errors/exceptions/unknown-dependencies.exception';
import { RuntimeException } from '../errors/exceptions/runtime.exception';
import { Module } from './module';
import { Metatype } from '@nestjs/common/interfaces/metatype.interface';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import { MiddlewareWrapper } from '../middlewares/container';
import { isUndefined, isNil, isFunction } from '@nestjs/common/utils/shared.utils';
import { PARAMTYPES_METADATA, SELF_DECLARED_DEPS_METADATA } from '@nestjs/common/constants';

export class Injector {
    public loadInstanceOfMiddleware(
        wrapper: MiddlewareWrapper,
        collection: Map<string, MiddlewareWrapper>,
        module: Module) {

        const { metatype } = wrapper;
        const currentMetatype = collection.get(metatype.name);
        if (currentMetatype.instance !== null) return;

        this.resolveConstructorParams(wrapper as any, module, null, null, (instances) => {
            collection.set(metatype.name, {
                instance: new metatype(...instances),
                metatype,
            });
        });
    }

    public loadInstanceOfRoute(wrapper: InstanceWrapper<Controller>, module: Module) {
        const routes = module.routes;
        this.loadInstance<Controller>(wrapper, routes, module);
    }

    public loadPrototypeOfInstance<T>({ metatype, name }: InstanceWrapper<T>, collection: Map<string, InstanceWrapper<T>>) {
        if (!collection) return;

        const target = collection.get(name);
        if (target.isResolved || !isNil(target.inject)) return;

        collection.set(name, {
            ...collection.get(name),
            instance: Object.create(metatype.prototype),
        });
    }

    public loadInstanceOfComponent(wrapper: InstanceWrapper<Injectable>, module: Module, context: Module[] = []) {
        const components = module.components;
        this.loadInstance<Injectable>(wrapper, components, module, context);
    }

    public loadInstance<T>(wrapper: InstanceWrapper<T>, collection, module: Module, context: Module[] = []) {
        const { metatype, name, inject } = wrapper;
        const currentMetatype = collection.get(name);
        if (isUndefined(currentMetatype)) {
            throw new RuntimeException('');
        }

        if (currentMetatype.isResolved) return;
        this.resolveConstructorParams<T>(wrapper, module, inject, context, (instances) => {
            if (isNil(inject)) {
                currentMetatype.instance = Object.assign(
                    currentMetatype.instance,
                    new metatype(...instances),
                );
            } else {
                currentMetatype.instance = currentMetatype.metatype(...instances);
            }
            currentMetatype.isResolved = true;
        });
    }

    public resolveConstructorParams<T>(
        wrapper: InstanceWrapper<T>,
        module: Module,
        inject: any[],
        context: Module[],
        callback: (args) => void) {

        let isResolved = true;
        const args = isNil(inject) ? this.reflectConstructorParams(wrapper.metatype) : inject;

        const instances = args.map((param) => {
            const paramWrapper = this.resolveSingleParam<T>(wrapper, param, module, context);
            if (paramWrapper.isExported && !paramWrapper.isResolved) {
                isResolved = false;
            }
            return paramWrapper.instance;
        });
        isResolved && callback(instances);
    }

    public reflectConstructorParams<T>(type: Metatype<T>): any[] {
        const paramtypes = Reflect.getMetadata(PARAMTYPES_METADATA, type) || [];
        const selfParams = this.reflectSelfParams<T>(type);

        selfParams.forEach(({ index, param }) => paramtypes[index] = param);
        return paramtypes;
    }

    public reflectSelfParams<T>(type: Metatype<T>): any[] {
        return Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, type) || [];
    }

    public resolveSingleParam<T>(
        wrapper: InstanceWrapper<T>,
        param: Metatype<any> | string | symbol,
        module: Module,
        context: Module[]) {

        if (isUndefined(param)) {
            throw new RuntimeException();
        }
        return this.resolveComponentInstance<T>(
            module,
            isFunction(param) ? (param as Metatype<any>).name : param,
            wrapper,
            context,
        );
    }

    public resolveComponentInstance<T>(module: Module, name: any, wrapper: InstanceWrapper<T>, context: Module[]) {
        const components = module.components;
        const instanceWrapper = this.scanForComponent(components, name, module, wrapper, context);

        if (!instanceWrapper.isResolved && !instanceWrapper.isExported) {
            this.loadInstanceOfComponent(components.get(name), module);
        }
        return instanceWrapper;
    }

    public scanForComponent(components: Map<string, any>, name: any, module: Module, { metatype }, context: Module[] = []) {
        const component = this.scanForComponentInScopes(context, name, metatype);
        if (component) {
            return component;
        }
        const scanInExports = () => this.scanForComponentInExports(components, name, module, metatype, context);
        return components.has(name) ? components.get(name) : scanInExports();
    }

    public scanForComponentInExports(components: Map<string, any>, name: any, module: Module, metatype, context: Module[] = []) {
        const instanceWrapper = this.scanForComponentInRelatedModules(module, name, context);
        if (!isNil(instanceWrapper)) {
            return instanceWrapper;
        }
        const { exports } = module;
        if (!exports.has(metatype.name)) {
            throw new UnknownDependenciesException(metatype.name);
        }
        return {
            instance: null,
            isResolved: false,
            isExported: true,
        };
    }

    public scanForComponentInScopes(context: Module[], name: any, metatype) {
        context = context || [];
        for (const ctx of context) {
            const component = this.scanForComponentInScope(ctx, name, metatype);
            if (component) return component;
        }
        return null;
    }

    public scanForComponentInScope(context: Module, name: any, metatype) {
        try {
            const component = this.scanForComponent(
                context.components, name, context, { metatype }, null,
            );
            if (!component.isResolved) {
                this.loadInstanceOfComponent(component, context);
            }
            return component;
        }
        catch (e) {
            return null;
        }
    }

    public scanForComponentInRelatedModules(module: Module, name: any, context: Module[]) {
        const relatedModules = module.relatedModules || [];
        let component = null;

        (relatedModules as any[]).forEach((relatedModule) => {
            const { components, exports } = relatedModule;
            const isInScope = context === null;
            if ((!exports.has(name) && !isInScope) || !components.has(name)) {
                return;
            }
            component = components.get(name);
            if (!component.isResolved) {
                const ctx = isInScope ? [module] : [].concat(context, module);
                this.loadInstanceOfComponent(component, relatedModule, ctx);
            }
        });
        return component;
    }

}