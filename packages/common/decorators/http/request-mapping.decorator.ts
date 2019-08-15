import { METHOD_METADATA, PATH_METADATA } from '../../constants';
import { RequestMethod } from '../../enums/request-method.enum';
import { RequestMappingMetadata } from '../../interfaces/request-mapping-metadata.interface';

const defaultMetadata = {
  [PATH_METADATA]: '/',
  [METHOD_METADATA]: RequestMethod.GET,
};

export const RequestMapping = (
  metadata: RequestMappingMetadata = defaultMetadata,
): MethodDecorator => {
  const pathMetadata = metadata[PATH_METADATA];
  const path = pathMetadata && pathMetadata.length ? pathMetadata : '/';
  const requestMethod = metadata[METHOD_METADATA] || RequestMethod.GET;

  return (target, key, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(PATH_METADATA, path, descriptor.value);
    Reflect.defineMetadata(METHOD_METADATA, requestMethod, descriptor.value);
    return descriptor;
  };
};

const createMappingDecorator = (method: RequestMethod) => (
  path?: string | string[],
): MethodDecorator => {
  return RequestMapping({
    [PATH_METADATA]: path,
    [METHOD_METADATA]: method,
  });
};

/**
 * @publicApi
 *
 * @description
 * Routes HTTP POST requests to the specified path.
 *
 * @see [Routing](https://docs.nestjs.com/controllers#routing)
 */
export const Post = createMappingDecorator(RequestMethod.POST);

/**
 * @publicApi
 *
 * @description
 * Routes HTTP GET requests to the specified path.
 *
 * @see [Routing](https://docs.nestjs.com/controllers#routing)
 */
export const Get = createMappingDecorator(RequestMethod.GET);

/**
 * @publicApi
 *
 * @description
 * Routes HTTP DELETE requests to the specified path.
 *
 * @see [Routing](https://docs.nestjs.com/controllers#routing)
 */
export const Delete = createMappingDecorator(RequestMethod.DELETE);

/**
 * @publicApi
 *
 * @description
 * Routes HTTP PUT requests to the specified path.
 *
 * @see [Routing](https://docs.nestjs.com/controllers#routing)
 */
export const Put = createMappingDecorator(RequestMethod.PUT);

/**
 * @publicApi
 *
 * @description
 * Routes HTTP PATCH requests to the specified path.
 *
 * @see [Routing](https://docs.nestjs.com/controllers#routing)
 */
export const Patch = createMappingDecorator(RequestMethod.PATCH);

/**
 * @publicApi
 *
 * @description
 * Routes HTTP OPTIONS requests to the specified path.
 *
 * @see [Routing](https://docs.nestjs.com/controllers#routing)
 */
export const Options = createMappingDecorator(RequestMethod.OPTIONS);

/**
 * @publicApi
 *
 * @description
 * Routes HTTP HEAD requests to the specified path.
 *
 * @see [Routing](https://docs.nestjs.com/controllers#routing)
 */
export const Head = createMappingDecorator(RequestMethod.HEAD);

/**
 * @publicApi
 *
 * @description
 * Routes all HTTP requests to the specified path.
 *
 * @see [Routing](https://docs.nestjs.com/controllers#routing)
 */
export const All = createMappingDecorator(RequestMethod.ALL);
