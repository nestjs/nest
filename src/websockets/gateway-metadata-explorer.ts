import { NestGateway } from './interfaces/nest-gateway.interface';
import { isUndefined, isConstructor, isFunction } from '../common/utils/shared.utils';
import { MESSAGE_MAPPING_METADATA, MESSAGE_METADATA, GATEWAY_SERVER_METADATA } from './constants';

export class GatewayMetadataExplorer {

    explore(instance: NestGateway): MessageMappingProperties[] {
        const instancePrototype = Object.getPrototypeOf(instance);
        return this.scanForHandlersFromPrototype(instance, instancePrototype)
    }

    scanForHandlersFromPrototype(instance: NestGateway, instancePrototype): MessageMappingProperties[] {
        return Object.getOwnPropertyNames(instancePrototype)
            .filter((method) => {
                const descriptor = Object.getOwnPropertyDescriptor(instancePrototype, method);
                if (descriptor.set || descriptor.get) {
                    return false;
                }
                return !isConstructor(method) && isFunction(instancePrototype[method]);
            })
            .map((methodName) => this.exploreMethodMetadata(instance, instancePrototype, methodName))
            .filter((metadata) => metadata !== null);
    }

    exploreMethodMetadata(instance, instancePrototype, methodName: string): MessageMappingProperties {
        const callbackMethod = instancePrototype[methodName];
        const isMessageMapping = Reflect.getMetadata(MESSAGE_MAPPING_METADATA, callbackMethod);

        if (isUndefined(isMessageMapping)) {
            return null;
        }
        const message = Reflect.getMetadata(MESSAGE_METADATA, callbackMethod);
        return {
            targetCallback: (<Function>callbackMethod).bind(instance),
            message,
        };
    }

    *scanForServerHooks(instance: NestGateway): IterableIterator<string> {
        for (const propertyKey in instance) {
            if (isFunction(propertyKey)) continue;

            const property = String(propertyKey);
            const isServer = Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, property);
            if (isUndefined(isServer)) continue;

            yield property;
        }
    }

}

export interface MessageMappingProperties {
    message: string,
    targetCallback: Function,
}