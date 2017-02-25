import 'reflect-metadata';
import { InstanceWrapper } from './container';
import { UnkownDependenciesException } from '../../errors/exceptions/unkown-dependencies.exception';
import { MiddlewareMetatype } from '../middlewares/interfaces/middleware-metatype.interface';
import { RuntimeException } from '../../errors/exceptions/runtime.exception';
import { Module } from './module';
import { Metatype } from '../../common/interfaces/metatype.interface';
import { Controller } from '../../common/interfaces/controller.interface';
import { Injectable } from '../../common/interfaces/injectable.interface';
import { MiddlewareWrapper } from '../middlewares/container';
import { isUndefined } from '../../common/utils/shared.utils';
import { PARAMTYPES_METADATA } from '../../common/constants';

export class Injector {

    loadInstanceOfMiddleware(
        metatype: MiddlewareMetatype,
        collection: Map<string, MiddlewareWrapper>,
        module: Module) {

        const currentFetchedMiddleware = collection.get(metatype.name);
        if (currentFetchedMiddleware.instance !== null) return;

        this.resolveConstructorParams(metatype, module, (argsInstances) => {
            collection.set(metatype.name, {
                instance: new metatype(...argsInstances),
                metatype
            })
        });
    }

    loadInstanceOfRoute(metatype: Metatype<Controller>, module: Module) {
        const routes = module.routes;
        this.loadInstance<Controller>(metatype, routes, module);
    }

    loadPrototypeOfInstance<T>(metatype: Metatype<T>, collection: Map<string, InstanceWrapper<T>>) {
        if (!collection || collection.get(metatype.name).isResolved) { return; }

        collection.set(metatype.name, {
            ...collection.get(metatype.name),
            instance: Object.create(metatype.prototype),
        });
    }

    loadInstanceOfComponent(metatype: Metatype<Injectable>, module: Module) {
        const components = module.components;
        this.loadInstance<Injectable>(metatype, components, module);
    }

    loadInstance<T>(type: Metatype<T>, collection, module: Module) {
        const currentFetchedInstance = collection.get(type.name);
        if (isUndefined(currentFetchedInstance)) {
            throw new RuntimeException('');
        }
        if (currentFetchedInstance.isResolved) return;

        this.resolveConstructorParams<T>(type, module, (argsInstances) => {
            currentFetchedInstance.instance = Object.assign(
                currentFetchedInstance.instance,
                new type(...argsInstances),
            );
            currentFetchedInstance.isResolved = true;
        });
    }

    private resolveConstructorParams<T>(type: Metatype<T>, module: Module, callback: Function) {
        let constructorParams = Reflect.getMetadata(PARAMTYPES_METADATA, type) || [];
        if ((<any>type).dependencies) {
            constructorParams = (<any>type).dependencies;
        }

        const argsInstances = constructorParams.map(param => this.resolveSingleParam<T>(type, param, module));
        callback(argsInstances);
    }

    private resolveSingleParam<T>(type: Metatype<T>, param: Metatype<any>, module: Module) {
        if (isUndefined(param)) {
            throw new RuntimeException('');
        }
        return this.resolveComponentInstance<T>(module, param, type);
    }

    private resolveComponentInstance<T>(module: Module, param: Metatype<any>, metatype: Metatype<T>) {
        const components = module.components;
        const instanceWrapper = this.scanForComponent<T>(components, param, module, metatype);

        if (instanceWrapper.instance === null) {
            this.loadInstanceOfComponent(param, module);
        }
        return instanceWrapper.instance;
    }

    private scanForComponent<T>(
        components: Map<string, any>,
        param: Metatype<any>,
        module: Module,
        metatype: Metatype<T>) {

        if (components.has(param.name)) {
            return components.get(param.name);
        }

        const instanceWrapper = this.scanForComponentInRelatedModules(module, param);
        if (instanceWrapper === null) {
            throw new UnkownDependenciesException(metatype.name);
        }
        return instanceWrapper;
    }

    private scanForComponentInRelatedModules(module: Module, metatype: Metatype<any>) {
        const relatedModules = module.relatedModules;
        let component = null;

        relatedModules.forEach((relatedModule) => {
            const { components, exports } = relatedModule;
            if (!exports.has(metatype.name) || !components.has(metatype.name)) { return; }

            component = components.get(metatype.name);
            if (!component.isResolved) {
                this.loadInstanceOfComponent(metatype, relatedModule);
            }
        });
        return component;
    }

}