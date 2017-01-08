import "reflect-metadata";
import { PathProps } from "./../interfaces";
import { RequestMethod } from "./../enums";

export const Path = (props: PathProps): MethodDecorator => {
    const requestMethod = props.requestMethod || RequestMethod.GET;

    return function(target, key, descriptor: PropertyDescriptor) {
        Reflect.defineMetadata("path", props.path, descriptor.value);
        Reflect.defineMetadata("requestMethod", requestMethod, descriptor.value);

        return descriptor;
    }
};