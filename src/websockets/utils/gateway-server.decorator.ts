import 'reflect-metadata';
import { GATEWAY_SERVER_METADATA } from '../constants';

/**
 * Attaches the native Web Socket Server to the given property.
 */
export const WebSocketServer = (): PropertyDecorator => {
  return (target: object, propertyKey: string | symbol) => {
    Reflect.set(target, propertyKey, null);
    Reflect.defineMetadata(GATEWAY_SERVER_METADATA, true, target, propertyKey);
  };
};
