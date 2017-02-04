import "reflect-metadata";
import { RequestMappingProps } from "../interfaces/path-props.interface";
import { RequestMethod } from "../enums/request-method.enum";

export const RequestMapping = (props: RequestMappingProps): MethodDecorator => {
    const requestMethod = props.method || RequestMethod.GET;

    return function(target, key, descriptor: PropertyDescriptor) {
        Reflect.defineMetadata("path", props.path, descriptor.value);
        Reflect.defineMetadata("method", requestMethod, descriptor.value);

        return descriptor;
    }
};