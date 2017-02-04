import "reflect-metadata";
import { RouteProps } from "../interfaces/route-props.interface";
import { InvalidPathVariableException } from "../../errors/exceptions/invalid-path-variable.exception";

export const Controller = (routeProps: RouteProps): ClassDecorator => {
    if (typeof routeProps.path === "undefined") {
        throw new InvalidPathVariableException("Controller")
    }

    return (target: Object) => {
        Reflect.defineMetadata("path", routeProps.path, target);
    }
};