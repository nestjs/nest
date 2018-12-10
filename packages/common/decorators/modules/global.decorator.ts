import { GLOBAL_MODULE_METADATA } from '../../constants';

/**
 * Makes the module global-scoped.
 * Once imported will be available for all existing modules.
 */
export function Global(): ClassDecorator {
  return (target: any) => {
    Reflect.defineMetadata(GLOBAL_MODULE_METADATA, true, target);
  };
}
