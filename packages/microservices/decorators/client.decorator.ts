import { CLIENT_CONFIGURATION_METADATA, CLIENT_METADATA } from '../constants';
import { ClientOptions } from '../interfaces/client-metadata.interface';

/**
 * Attaches the `ClientProxy` instance to the given property
 *
 * @param  {ClientOptions} metadata optional client metadata
 */
export const Client = (metadata?: ClientOptions | Promise<ClientOptions>) => {
  return (target: object, propertyKey: string | symbol): void => {
    /*
     *  Check if metadata will require unwrapping before using
     */
    // @ts-ignore
    if (metadata instanceof Promise || typeof metadata.then === 'function') {
      (metadata as Promise<ClientOptions>).then(m => {
        Reflect.set(target, propertyKey, null);
        Reflect.defineMetadata(CLIENT_METADATA, true, target, propertyKey);
        Reflect.defineMetadata(
          CLIENT_CONFIGURATION_METADATA,
          m,
          target,
          propertyKey,
        );
      });
      return;
    }
    /*
     *  Just assign metadata to Reflector without unwrapping it
     */
    Reflect.set(target, propertyKey, null);
    Reflect.defineMetadata(CLIENT_METADATA, true, target, propertyKey);
    Reflect.defineMetadata(
      CLIENT_CONFIGURATION_METADATA,
      metadata,
      target,
      propertyKey,
    );
  };
};
