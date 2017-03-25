import 'reflect-metadata';
import { InstanceWrapper } from './container';
import { UnkownDependenciesException } from '../../errors/exceptions/unkown-dependencies.exception';
import { RuntimeException } from '../../errors/exceptions/runtime.exception';
import { Module } from './module';
import { Metatype } from '../../common/interfaces/metatype.interface';
import { Controller } from '../../common/interfaces/controller.interface';
import { Injectable } from '../../common/interfaces/injectable.interface';
import { MiddlewareWrapper } from '../middlewares/container';
import { isUndefined, isNil, isFunction } from '../../common/utils/shared.utils';
import { PARAMTYPES_METADATA, SELF_PARAMS_METADATA } from '../../common/constants';

export class Injector {

    loadInstanceOfMiddleware(
        wrapper: MiddlewareWrapper,
        collection: Map<string, MiddlewareWrapper>,
        module: Module) {

        const { metatype } = wrapper;
        const currentFetchedMiddleware = collection.get(metatype.name);
        if (currentFetchedMiddleware.instance !== null) return;

        this.resolveConstructorParams(<any>wrapper, module, null, (argsInstances) => {
            collection.set(metatype.name, {
                instance: new metatype(...argsInstances),
                metatype
            })
        });
    }

    loadInstanceOfRoute(wrapper: InstanceWrapper<Controller>, module: Module) {
        const routes = module.routes;
        this.loadInstance<Controller>(wrapper, routes, module);
    }

    loadPrototypeOfInstance<T>({ metatype, name }: InstanceWrapper<T>, collection: Map<string, InstanceWrapper<T>>) {
        if (!collection) { return; }

        const target = collection.get(name);
        if (target.isResolved || !isNil(target.inject)) { return; }

        collection.set(name, {
            ...collection.get(name),
            instance: Object.create(metatype.prototype),
        });
    }

    loadInstanceOfComponent(wrapper: InstanceWrapper<Injectable>, module: Module) {
        const components = module.components;
        this.loadInstance<Injectable>(wrapper, components, module);
    }

    loadInstance<T>(wrapper: InstanceWrapper<T>, collection, module: Module) {
        const { metatype, name, inject } = wrapper;
        const currentFetchedInstance = collection.get(name);
        if (isUndefined(currentFetchedInstance)) {
            throw new RuntimeException('');
        }

        if (currentFetchedInstance.isResolved) return;
        this.resolveConstructorParams<T>(wrapper, module, inject, (argsInstances) => {
            if (isNil(inject)) {
                currentFetchedInstance.instance = Object.assign(
                    currentFetchedInstance.instance,
                    new metatype(...argsInstances),
                );
            }
            else {
                currentFetchedInstance.instance = currentFetchedInstance.metatype(...argsInstances);
            }
            currentFetchedInstance.isResolved = true;
        });
    }

    resolveConstructorParams<T>(wrapper: InstanceWrapper<T>, module: Module, inject: any[], callback: Function) {
        const args = isNil(inject) ? this.reflectConstructorParams(wrapper.metatype) : inject;
        const instances = args.map(param => this.resolveSingleParam<T>(wrapper, param, module));
        callback(instances);
    }

    reflectConstructorParams<T>(type: Metatype<T>): any[] {
        const paramtypes = Reflect.getMetadata(PARAMTYPES_METADATA, type) || [];
        const selfParams = this.reflectSelfParams<T>(type);

        selfParams.forEach(({ index, param }) => paramtypes[index] = param);
        return paramtypes;
    }

    reflectSelfParams<T>(type: Metatype<T>): any[] {
        return Reflect.getMetadata(SELF_PARAMS_METADATA, type) || [];
    }

    resolveSingleParam<T>(wrapper: InstanceWrapper<T>, param: Metatype<any> | string | symbol, module: Module) {
        if (isUndefined(param)) {
            throw new RuntimeException();
        }
        return this.resolveComponentInstance<T>(
            module,
            isFunction(param) ? (<Metatype<any>>param).name : param,
            wrapper
        );
    }

    resolveComponentInstance<T>(module: Module, name: any, wrapper: InstanceWrapper<T>) {
        const components = module.components;
        const instanceWrapper = this.scanForComponent<T>(components, name, module, wrapper);

        if (isNil(instanceWrapper.instance)) {
            this.loadInstanceOfComponent(components.get(name), module);
        }
        return instanceWrapper.instance;
    }

    scanForComponent<T>(
        components: Map<string, any>,
        name: any,
        module: Module,
        { metatype }) {

        if (components.has(name)) {
            return components.get(name);
        }

        const instanceWrapper = this.scanForComponentInRelatedModules(module, name);
        if (isNil(instanceWrapper)) {
            throw new UnkownDependenciesException(metatype.name);
        }
        return instanceWrapper;
    }

    scanForComponentInRelatedModules(module: Module, name: any) {
        const relatedModules = module.relatedModules || [];
        let component = null;

        (<Array<any>>relatedModules).forEach((relatedModule) => {
            const { components, exports } = relatedModule;
            if (!exports.has(name) || !components.has(name)) { return; }

            component = components.get(name);
            if (!component.isResolved) {
                this.loadInstanceOfComponent(component, relatedModule);
            }
        });
        return component;
    }

}