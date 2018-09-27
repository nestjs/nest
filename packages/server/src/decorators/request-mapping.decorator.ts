import { MetadataStorage } from '../metadata-storage';
import { RequestMethod } from '../enums';

export function RequestMapping(
  path: string = '/',
  requestMethod: keyof RequestMethod = RequestMethod.GET,
): MethodDecorator {
  return (target, propertyKey) => {
    MetadataStorage.requestMapping.add({
      target: target.constructor,
      propertyKey,
      requestMethod,
      path,
    });
  };
}

const createMappingDecorator = (method: keyof RequestMethod) => (
  path?: string,
) => RequestMapping(path, method);

export const Post = createMappingDecorator(RequestMethod.POST);
export const Get = createMappingDecorator(RequestMethod.GET);
export const Delete = createMappingDecorator(RequestMethod.DELETE);
export const Put = createMappingDecorator(RequestMethod.PUT);
export const Patch = createMappingDecorator(RequestMethod.PATCH);
export const Options = createMappingDecorator(RequestMethod.OPTIONS);
export const Head = createMappingDecorator(RequestMethod.HEAD);
export const All = createMappingDecorator(RequestMethod.ALL);
