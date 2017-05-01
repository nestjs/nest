import 'reflect-metadata';
import { CLIENT_CONFIGURATION_METADATA, CLIENT_METADATA } from '../constants';
import { ClientMetadata } from '../interfaces/client-metadata.interface';

export const Client = (metadata?: ClientMetadata) => {
    return (target: object, propertyKey: string | symbol): void => {
        Reflect.set(target, propertyKey, null);
        Reflect.defineMetadata(CLIENT_METADATA, true, target, propertyKey);
        Reflect.defineMetadata(CLIENT_CONFIGURATION_METADATA, metadata, target, propertyKey);
    };
};