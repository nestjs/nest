import 'reflect-metadata';
import { RequestMappingMetadata } from '../interfaces/request-mapping-metadata.interface';
import { RequestMethod } from '../enums/request-method.enum';
import { PATH_METADATA, METHOD_METADATA } from '../constants';

const defaultMetadata = { path: '/', method: RequestMethod.GET };
export const RequestMapping = (metadata: RequestMappingMetadata = defaultMetadata): MethodDecorator => {
    const path = metadata.path || '/';
    const requestMethod = metadata.method || RequestMethod.GET;

    return function(target, key, descriptor: PropertyDescriptor) {
        Reflect.defineMetadata(PATH_METADATA, path, descriptor.value);
        Reflect.defineMetadata(METHOD_METADATA, requestMethod, descriptor.value);

        return descriptor;
    }
};