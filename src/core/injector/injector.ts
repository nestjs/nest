import "reflect-metadata";
import { ModuleDependencies, InstanceWrapper } from "./container";
import { Middleware } from "../middlewares/interfaces/middleware.interface";
import { CircularDependencyException } from "../../errors/exceptions/circular-dependency.exception";
import { UnkownDependenciesException } from "../../errors/exceptions/unkown-dependencies.exception";
import { MiddlewareProto } from "../middlewares/interfaces/middleware-proto.interface";
import { RuntimeException } from "../../errors/exceptions/runtime.exception";

export class Injector {

    loadInstanceOfMiddleware(
        middlewareType,
        collection: Map<MiddlewareProto, Middleware>,
        module: ModuleDependencies) {

        const currentFetchedMiddleware = collection.get(middlewareType);

        if(currentFetchedMiddleware === null) {
            this.resolveConstructorParams(middlewareType, module, (argsInstances) => {
                collection.set(middlewareType, new middlewareType(...argsInstances))
            });
        }
    }

    loadInstanceOfRoute(routeType, module: ModuleDependencies) {
        const routes = module.routes;
        this.loadInstance(routeType, routes, module);
    }

    loadPrototypeOfInstance<T>(type, collection: Map<T, InstanceWrapper<T>>) {
        if (!collection) { return; }

        collection.set(type, {
            ...collection.get(type),
            instance: Object.create(type.prototype),
        });
    }

    loadInstanceOfComponent(componentType, module: ModuleDependencies) {
        const components = module.components;
        this.loadInstance(componentType, components, module);
    }

    loadInstance(type, collection, module: ModuleDependencies) {
        const currentFetchedInstance = collection.get(type);
        if (typeof currentFetchedInstance === 'undefined') {
            throw new RuntimeException('');
        }
        if (!currentFetchedInstance.isResolved) {
            this.resolveConstructorParams(type, module, (argsInstances) => {
                currentFetchedInstance.instance = Object.assign(
                    currentFetchedInstance.instance,
                    new type(...argsInstances),
                );
                currentFetchedInstance.isResolved = true;
            });
        }
    }

    private resolveConstructorParams(type, module, callback) {
        let constructorParams = Reflect.getMetadata('design:paramtypes', type) || [];

        if ((<any>type).dependencies) {
            constructorParams = (<any>type).dependencies;
        }
        const argsInstances = constructorParams.map((param) => (
            this.resolveSingleParam(type, param, module)
        ));
        callback(argsInstances);
    }

    private resolveSingleParam(targetType, param, module: ModuleDependencies) {
        if (typeof param === 'undefined') {
            throw new CircularDependencyException(targetType);
        }

        return this.resolveComponentInstance(module, param, targetType);
    }

    private resolveComponentInstance(module: ModuleDependencies, param, componentType) {
        const components = module.components;
        const instanceWrapper = this.scanForComponent(components, param, module, componentType);

        if (instanceWrapper.instance === null) {
            this.loadInstanceOfComponent(param, module);
        }
        return instanceWrapper.instance;
    }

    private scanForComponent(components, param, module, componentType) {
        if (!components.has(param)) {
            const instanceWrapper = this.scanForComponentInRelatedModules(module, param);

            if (instanceWrapper === null) {
                throw new UnkownDependenciesException(componentType);
            }
            return instanceWrapper;
        }
        return components.get(param);
    }

    private scanForComponentInRelatedModules(module: ModuleDependencies, componentType) {
        const relatedModules = module.relatedModules;
        let component = null;

        relatedModules.forEach((relatedModule) => {
            const { components, exports } = relatedModule;

            if (!exports.has(componentType) || !components.has(componentType)) {
                return;
            }

            component = components.get(componentType);
            if (!component.isResolved) {
                this.loadInstanceOfComponent(componentType, relatedModule);
            }
        });
        return component;
    }

}