import 'reflect-metadata';
import { GatewayMetadata } from '../interfaces';
import { PORT_METADATA, NAMESPACE_METADATA, GATEWAY_METADATA } from '../constants';

export const SocketGateway = (metadata?: GatewayMetadata): ClassDecorator => {
    metadata = metadata || {};
    return (target: Object) => {
        Reflect.defineMetadata(GATEWAY_METADATA, true, target);
        Reflect.defineMetadata(NAMESPACE_METADATA, metadata.namespace, target);
        Reflect.defineMetadata(PORT_METADATA, metadata.port, target);
    }
};