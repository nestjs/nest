import 'reflect-metadata';
import { GATEWAY_SERVER_METADATA } from '../constants';

export const WebSocketServer = (): PropertyDecorator => {
    return (target: Object, propertyKey: string | symbol) => {
        Reflect.set(target, propertyKey, null);
        Reflect.defineMetadata(GATEWAY_SERVER_METADATA, true, target, propertyKey);
    }
};