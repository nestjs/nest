import 'reflect-metadata';
import { SOCKET_SERVER_METADATA } from '../constants';

export const SocketServer: PropertyDecorator = (target: Object, propertyKey: string | symbol): void => {
    Reflect.set(target, propertyKey, null);
    Reflect.defineMetadata(SOCKET_SERVER_METADATA, true, target, propertyKey);
};