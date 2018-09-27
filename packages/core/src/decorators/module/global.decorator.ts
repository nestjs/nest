import { SHARED_MODULE_METADATA } from '../../constants';

export function Global(): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(SHARED_MODULE_METADATA, true, target);
  };
}
