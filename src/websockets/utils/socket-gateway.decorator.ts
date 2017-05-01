import 'reflect-metadata';
import { GatewayMetadata } from '../interfaces';
import { PORT_METADATA, NAMESPACE_METADATA, GATEWAY_METADATA, GATEWAY_MIDDLEWARES } from '../constants';

export const WebSocketGateway = (metadata?: GatewayMetadata): ClassDecorator => {
    metadata = metadata || {};
    return (target: object) => {
        Reflect.defineMetadata(GATEWAY_METADATA, true, target);
        Reflect.defineMetadata(NAMESPACE_METADATA, metadata.namespace, target);
        Reflect.defineMetadata(PORT_METADATA, metadata.port, target);
        Reflect.defineMetadata(GATEWAY_MIDDLEWARES, metadata.middlewares, target);
    };
};