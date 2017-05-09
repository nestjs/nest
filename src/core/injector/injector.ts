import 'reflect-metadata';
import { InstanceWrapper } from './container';
import { UnknownDependenciesException } from '../../errors/exceptions/unknown-dependencies.exception';
import { RuntimeException } from '../../errors/exceptions/runtime.exception';
import { Module } from './module';
import { Metatype } from '../../common/interfaces/metatype.interface';
import { Controller } from '../../common/interfaces/controller.interface';
import { Injectable } from '../../common/interfaces/injectable.interface';
import { MiddlewareWrapper } from '../middlewares/container';
import { isUndefined, isNil, isFunction } from '../../common/utils/shared.utils';
import { PARAMTYPES_METADATA, SELF_DECLARED_DEPS_METADATA } from '../../common/constants';

export class Injector {
    public loadInstanceOfMiddleware(
        wrapper: MiddlewareWrapper,
        collection: Map<string, MiddlewareWrapper>,
        module: Module) {

        const { metatype } = wrapper;
        const currentMetatype = collection.get(metatype.name);
        if (currentMetatype.instance !== null) return;

        this.resolveConstructorParams(wrapper as any, module, null, argsInstances => {
            collection.set(metatype.name, {
                instance: new metatype(...argsInstances),
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

    public loadInstanceOfComponent(wrapper: InstanceWrapper<Injectable>, module: Module) {
        const components = module.components;
        this.loadInstance<Injectable>(wrapper, components, module);
    }

    public loadInstance<T>(wrapper: InstanceWrapper<T>, collection, module: Module) {
        const { metatype, name, inject } = wrapper;
        const currentMetatype = collection.get(name);
        if (isUndefined(currentMetatype)) {
            throw new RuntimeException('');
        }

        if (currentMetatype.isResolved) return;
        this.resolveConstructorParams<T>(wrapper, module, inject, argsInstances => {
            if (isNil(inject)) {
                currentMetatype.instance = Object.assign(
                    currentMetatype.instance,
                    new metatype(...argsInstances),
                );
            } else {
                currentMetatype.instance = currentMetatype.metatype(...argsInstances);
            }
            currentMetatype.isResolved = true;
        });
    }

    public resolveConstructorParams<T>(
        wrapper: InstanceWrapper<T>,
        module: Module,
        inject: any[],
        callback: (args) => void) {

        const args = isNil(inject) ? this.reflectConstructorParams(wrapper.metatype) : inject;
        const instances = args.map(param => this.resolveSingleParam<T>(wrapper, param, module));
        callback(instances);
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

    public resolveSingleParam<T>(wrapper: InstanceWrapper<T>, param: Metatype<any> | string | symbol, module: Module) {
        if (isUndefined(param)) {
            throw new RuntimeException();
        }
        return this.resolveComponentInstance<T>(
            module,
            isFunction(param) ? (param as Metatype<any>).name : param,
            wrapper,
        );
    }

    public resolveComponentInstance<T>(module: Module, name: any, wrapper: InstanceWrapper<T>) {
        const components = module.components;
        const instanceWrapper = this.scanForComponent(components, name, module, wrapper);

        if (!instanceWrapper.isResolved) {
            this.loadInstanceOfComponent(components.get(name), module);
        }
        return instanceWrapper.instance;
    }

    public scanForComponent(components: Map<string, any>, name: any, module: Module, { metatype }) {
        if (components.has(name)) {
            return components.get(name);
        }

        const instanceWrapper = this.scanForComponentInRelatedModules(module, name);
        if (isNil(instanceWrapper)) {
            throw new UnknownDependenciesException(metatype.name);
        }
        return instanceWrapper;
    }

    public scanForComponentInRelatedModules(module: Module, name: any) {
        const relatedModules = module.relatedModules || [];
        let component = null;

        (relatedModules as any[]).forEach((relatedModule) => {
            const { components, exports } = relatedModule;
            if (!exports.has(name) || !components.has(name)) return;

            component = components.get(name);
            if (!component.isResolved) {
                this.loadInstanceOfComponent(component, relatedModule);
            }
        });
        return component;
    }

}