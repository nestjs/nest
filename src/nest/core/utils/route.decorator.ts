import "reflect-metadata";
import { RouteProps } from "./../interfaces";

export const Route = (routeProps: RouteProps): ClassDecorator => {
    return (target: Object) => {
        Reflect.defineMetadata("path", routeProps.path, target);
    }
};