import "reflect-metadata";
import { Route } from "./interfaces";
import { InstanceWrapper } from "./container";
import { Component } from "./interfaces/component.interface";

export class NestInstanceLoader {

    loadInstanceOfRoute(
        routeType,
        collection: Map<Route, InstanceWrapper<Route>>,
        components: Map<Component, InstanceWrapper<Component>>
    ) {
        const currentFetchedRoute = collection.get(routeType);

        if(currentFetchedRoute.instance === null) {
            const argsInstances = [];
            const params = Reflect.getMetadata('design:paramtypes', routeType) || [];

            params.map((param) => {
                if (typeof param === "undefined")
                    throw new Error(`Can't create instance of ` + routeType +
                        `. It is possible that you are trying to do cycle-dependency A->B, B->A.`);

                const componentType = this.resolveComponentInstance(components, param, routeType);
                argsInstances.push(componentType);
            });
            currentFetchedRoute.instance = new routeType(...argsInstances);
        }
    }

    private resolveComponentInstance(collection: Map<Component, InstanceWrapper<Component>>, param, componentType) {
        if (!collection.has(param))
            throw new Error(`Can't recognize dependencies of ` + componentType);

        const instanceWrapper = collection.get(param);

        if (instanceWrapper.instance === null) {
            this.loadInstanceOfComponent(param, collection);
        }
        return instanceWrapper.instance;
    }

    public loadInstanceOfComponent(componentType, collection: Map<Component, InstanceWrapper<Component>>) {
        const currentFetchedComponentInstance = collection.get(componentType);

        if(currentFetchedComponentInstance.instance === null) {
            const argsInstances = [];
            const params = Reflect.getMetadata('design:paramtypes', componentType) || [];

            params.map((param) => {
                if (typeof param === "undefined")
                    throw new Error(`Can't create instance of ` + componentType +
                        `. It is possible that you are trying to do cycle-dependency A->B, B->A.`);

                const instance = this.resolveComponentInstance(collection, param, componentType);
                argsInstances.push(instance);
            });
            currentFetchedComponentInstance.instance = new componentType(...argsInstances);
        }
    }

}