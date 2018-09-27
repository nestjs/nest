import { SCOPES, SCOPE_METADATA } from '../../constants';

export function TransientScope(): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(SCOPE_METADATA, SCOPES.TRANSIENT, target);
  };
}
