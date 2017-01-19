import "reflect-metadata";
import { Route } from "../interfaces/route.interface";
import { RouteProps } from "../interfaces/route-props.interface";

export class MiddlewaresBuilder {
    private storedConfiguration: MiddlewareConfiguration[] = [];

    use(configuration: MiddlewareConfiguration) {
        this.storedConfiguration.push(configuration);
        return this;
    }

    build() {
        return this.storedConfiguration.slice(0);
    }

}

export interface MiddlewareConfiguration {
    middlewares: Middleware | Middleware[];
    forRoutes: (Route | RouteProps)[];
}

export interface Middleware {
    resolve: () => (res, req, next) => void;
}