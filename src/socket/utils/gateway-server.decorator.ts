import 'reflect-metadata';
import { GATEWAY_SERVER_METADATA } from '../constants';

export const GatewayServer: PropertyDecorator = (target: Object, propertyKey: string | symbol): void => {
    Reflect.set(target, propertyKey, null);
    Reflect.defineMetadata(GATEWAY_SERVER_METADATA, true, target, propertyKey);
};