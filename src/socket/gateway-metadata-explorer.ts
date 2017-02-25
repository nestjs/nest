import { NestGateway } from './interfaces/nest-gateway.interface';
import { isUndefined, isConstructor, isFunction } from '../common/utils/shared.utils';
import { MESSAGE_MAPPING_METADATA, MESSAGE_METADATA, SOCKET_SERVER_METADATA } from './constants';

export class GatewayMetadataExplorer {

    static explore(instance: NestGateway): MessageMappingProperties[] {
        const instancePrototype = Object.getPrototypeOf(instance);
        return this.scanForHandlersFromPrototype(instance, instancePrototype)
    }

    static scanForHandlersFromPrototype(instance: NestGateway, instancePrototype): MessageMappingProperties[] {
        return Object.getOwnPropertyNames(instancePrototype)
            .filter((method) => {
                const descriptor = Object.getOwnPropertyDescriptor(instancePrototype, method);
                if (descriptor.set || descriptor.get) {
                    return false;
                }
                return !isConstructor(method) && isFunction(instancePrototype[method]);
            })
            .map((methodName) => this.exploreMethodMetadata(instance, instancePrototype, methodName))
            .filter((mapper) => mapper !== null);
    }

    static exploreMethodMetadata(instance, instancePrototype, methodName: string): MessageMappingProperties {
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

    static *scanForServerHooks(instance: NestGateway): IterableIterator<string> {
        for (const propertyKey in instance) {
            if (isFunction(propertyKey)) {
                continue;
            }
            
            const isServer = Reflect.getMetadata(SOCKET_SERVER_METADATA, instance, String(propertyKey));
            if (!isUndefined(isServer)) {
                yield String(propertyKey);
            }
        }
    }

}

export interface MessageMappingProperties {
    message: string,
    targetCallback: Function,
}