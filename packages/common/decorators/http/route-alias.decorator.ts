import { ROUTE_ALIAS_METADATA } from '../../constants';

/**
 * Alias for the route, which can be resolved to the full route path
 *
 * For example: `@WithAlias('alias')`
 *
 * @param routeAlias alias for the route
 *
 * @see [Model-View-Controller](https://docs.nestjs.com/techniques.mvc)
 *
 * @publicApi
 */
export function WithAlias(routeAlias: string | Symbol): MethodDecorator {
  return (
    target: object,
    key: string | symbol,
    descriptor: TypedPropertyDescriptor<any>,
  ) => {
    Reflect.defineMetadata(ROUTE_ALIAS_METADATA, routeAlias, descriptor.value);
    return descriptor;
  };
}
