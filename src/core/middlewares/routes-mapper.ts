import "reflect-metadata";
import { RouterBuilder } from "../router/router-builder";
import { UnkownRequestMappingException } from "../../errors/exceptions/unkown-request-mapping.exception";
import { RequestMethod } from "../../common/enums/request-method.enum";

export class RoutesMapper {
    private readonly routerBuilder = new RouterBuilder();

    mapRouteToRouteProps(routeProto) {
        const routePath: string = Reflect.getMetadata("path", routeProto);

        if (typeof routePath === "undefined") {
            return [ this.mapObjectToRouteProps(routeProto) ];
        }

        const paths = this.routerBuilder.scanForPathsFromPrototype(
            Object.create(routeProto),
            routeProto.prototype
        );

        return paths.map((singlePath) => ({
            path: this.validateRoutePath(routePath) + this.validateRoutePath(singlePath.path),
            method: singlePath.requestMethod
        }));
    }

    private mapObjectToRouteProps(route) {
        if (typeof route.path === "undefined") {
            throw new UnkownRequestMappingException();
        }

        return {
            path: this.validateRoutePath(route.path),
            method: (typeof route.method === "undefined") ? RequestMethod.ALL : route.method
        };
    }

    private validateRoutePath(routePath: string): string {
        return (routePath.charAt(0) !== '/') ? '/' + routePath : routePath;
    }

}
