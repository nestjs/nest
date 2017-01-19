import "reflect-metadata";
import { Route } from "./interfaces";
import { InstanceWrapper, ModuleDependencies } from "./container";
import { Component } from "./interfaces/component.interface";
import { Middleware } from "./middlewares/builder";

export class NestInstanceLoader {

    loadInstanceOfMiddleware(middlewareType, collection: Map<Middleware, Middleware>, module: ModuleDependencies) {
        const currentFetchedMiddleware = collection.get(middlewareType);

        if(currentFetchedMiddleware === null) {
            const argsInstances = [];
            const constructorParams = Reflect.getMetadata('design:paramtypes', middlewareType) || [];

            constructorParams.map((param) => {
                if (typeof param === "undefined") {
                    const msg = `Can't create instance of ${middlewareType} `
                        + `It is possible that you are trying to do circular-dependency A->B, B->A.`;

                    throw new Error(msg);
                }

                const componentType = this.resolveComponentInstance(module, param, middlewareType);
                argsInstances.push(componentType);
            });
            collection.set(middlewareType, new middlewareType(...argsInstances))
        }
    }

    loadInstanceOfRoute(routeType, module: ModuleDependencies) {
        const { routes } = module;

        const currentFetchedRoute = routes.get(routeType);

        if(currentFetchedRoute.instance === null) {
            const argsInstances = [];
            const constructorParams = Reflect.getMetadata('design:paramtypes', routeType) || [];

            constructorParams.map((param) => {
                if (typeof param === "undefined") {
                    const msg = `Can't create instance of ${routeType} `
                        + `It is possible that you are trying to do circular-dependency A->B, B->A.`;

                    throw new Error(msg);
                }

                const componentType = this.resolveComponentInstance(module, param, routeType);
                argsInstances.push(componentType);
            });
            currentFetchedRoute.instance = new routeType(...argsInstances);
        }
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
        let instanceWrapper = null;

        if (!components.has(param)) {
            instanceWrapper = this.scanForComponentInRelatedModules(module, param);

            if (instanceWrapper === null) {
                throw new Error(`Can't recognize dependencies of ` + componentType);
            }
        }
        else {
            instanceWrapper = components.get(param);
        }
        return instanceWrapper;
    }

    public loadInstanceOfComponent(componentType, module: ModuleDependencies) {
        const { components } = module;
        const currentFetchedComponentInstance = components.get(componentType);

        if(currentFetchedComponentInstance.instance === null) {
            const argsInstances = [];
            const constructorParams = Reflect.getMetadata('design:paramtypes', componentType) || [];

            constructorParams.map((param) => {
                if (typeof param === "undefined") {
                    const msg = `Can't create instance of ${componentType} `
                        + `It is possible that you are trying to do circular-dependency A->B, B->A.`;

                    throw new Error(msg);
                }

                const instance = this.resolveComponentInstance(module, param, componentType);
                argsInstances.push(instance);
            });
            currentFetchedComponentInstance.instance = new componentType(...argsInstances);
        }
    }

    private scanForComponentInRelatedModules(module: ModuleDependencies, componentType) {
        const relatedModules = module.relatedModules;
        let component = null;

        relatedModules.forEach((relatedModule) => {
            const components = relatedModule.components;
            const exports = relatedModule.exports;

            if (exports.has(componentType) && components.has(componentType)) {
                component = components.get(componentType);

                if (component.instance === null) {
                    this.loadInstanceOfComponent(componentType, relatedModule);
                }
            }
        });
        return component;
    }

}