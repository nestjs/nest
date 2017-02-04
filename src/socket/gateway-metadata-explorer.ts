import { Gateway } from "./interfaces/gateway.interface";

export class GatewayMetadataExplorer {

    static explore(instance: Gateway): MessageMappingProperties[] {
        const instancePrototype = Object.getPrototypeOf(instance);
        return this.scanForHandlersFromPrototype(instance, instancePrototype)
    }

    static scanForHandlersFromPrototype(instance: Gateway, instancePrototype): MessageMappingProperties[] {
        return Object.getOwnPropertyNames(instancePrototype)
            .filter((method) => method !== "constructor" && typeof instancePrototype[method] === "function")
            .map((methodName) => this.exploreMethodMetadata(instance, instancePrototype, methodName))
            .filter((mapper) => mapper !== null);
    }

    static exploreMethodMetadata(instance, instancePrototype, methodName: string): MessageMappingProperties {
        const callbackMethod = instancePrototype[methodName];
        const isMessageMapping = Reflect.getMetadata("__isMessageMapping", callbackMethod);

        if(typeof isMessageMapping === "undefined") {
            return null;
        }

        const message = Reflect.getMetadata("message", callbackMethod);
        return {
            targetCallback: (<Function>callbackMethod).bind(instance),
            message,
        };
    }

    static *scanForServerHooks(instance: Gateway): IterableIterator<string> {
        for (const propertyKey in instance) {
            if (typeof propertyKey === "function") {
                continue;
            }
            const isServer = Reflect.getMetadata("__isSocketServer", instance, String(propertyKey));
            if (typeof isServer !== "undefined") {
                yield String(propertyKey);
            }
        }
    }

}

export interface MessageMappingProperties {
    message: string,
    targetCallback: Function,
}