import { SCOPES, SCOPE_METADATA } from '../../constants';

export function RequestScope(): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(SCOPE_METADATA, SCOPES.REQUEST, target);
  };
}
