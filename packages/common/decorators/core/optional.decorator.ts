import {
  OPTIONAL_DEPS_METADATA,
  OPTIONAL_PROPERTY_DEPS_METADATA,
} from '../../constants';
import { isUndefined } from '../../utils/shared.utils';

/**
 * Parameter decorator for an injected dependency marking the
 * dependency as optional.
 *
 * For example:
 * ```typescript
 * constructor(@Optional() @Inject('HTTP_OPTIONS')private readonly httpClient: T) {}
 * ```
 *
 * @see [Optional providers](https://docs.nestjs.com/providers#optional-providers)
 *
 * @publicApi
 */
export function Optional(): PropertyDecorator & ParameterDecorator {
  return (target: object, key: string | symbol | undefined, index?: number) => {
    if (!isUndefined(index)) {
      const args = Reflect.getMetadata(OPTIONAL_DEPS_METADATA, target) || [];
      Reflect.defineMetadata(OPTIONAL_DEPS_METADATA, [...args, index], target);
      return;
    }
    const properties =
      Reflect.getMetadata(
        OPTIONAL_PROPERTY_DEPS_METADATA,
        target.constructor,
      ) || [];
    Reflect.defineMetadata(
      OPTIONAL_PROPERTY_DEPS_METADATA,
      [...properties, key],
      target.constructor,
    );
  };
}
