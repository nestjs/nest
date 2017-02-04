import "reflect-metadata";
import { RequestMappingMetadata } from "../interfaces/request-mapping-metadata.interface";
import { RequestMethod } from "../enums/request-method.enum";
import { InvalidPathVariableException } from "../../errors/exceptions/invalid-path-variable.exception";

export const RequestMapping = (metadata: RequestMappingMetadata): MethodDecorator => {
    if (typeof metadata.path === "undefined") {
        throw new InvalidPathVariableException("RequestMapping")
    }
    const requestMethod = metadata.method || RequestMethod.GET;

    return function(target, key, descriptor: PropertyDescriptor) {
        Reflect.defineMetadata("path", metadata.path, descriptor.value);
        Reflect.defineMetadata("method", requestMethod, descriptor.value);

        return descriptor;
    }
};