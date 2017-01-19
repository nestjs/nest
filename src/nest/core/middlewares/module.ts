import "reflect-metadata";
import { Express } from "express";
import { NestContainer } from "../container";
import { MiddlewaresBuilder, MiddlewareConfiguration, Middleware } from "./builder";
import { MiddlewaresContainer } from "./container";
import { MiddlewaresResolver } from "./resolver";
import { RouteProps } from "../interfaces/route-props.interface";

export class MiddlewaresModule {
    private static container = new MiddlewaresContainer();
    private static resolver: MiddlewaresResolver;

    static setup(container: NestContainer) {
        const modules = container.getModules();

        this.resolver = new MiddlewaresResolver(this.container, container);

        modules.forEach((module) => {
            const instance = module.instance;

            this.loadConfiguration(instance);
            this.resolver.resolveInstances(module);
        });
    }

    static loadConfiguration(instance) {
        if (!instance["configure"]) {
            return;
        }

        const middlewaresBuilder = instance.configure(new MiddlewaresBuilder());
        if (middlewaresBuilder) {
            const config = middlewaresBuilder.build();
            this.container.addConfig(config);
        }
    }

    static setupMiddlewares(app: Express) {
        const configs = this.container.getConfigs();

        configs.map((config: MiddlewareConfiguration) => {
            config.forRoutes.map((route: RouteProps) => {
                const path = route.path;

                (<Middleware[]>config.middlewares).map((middlewareType) => {
                    const middlewaresCollection = this.container.getMiddlewares();
                    const middleware = middlewaresCollection.get(middlewareType);

                    if (!middleware) {
                        throw new Error("Runtime error!");
                    }

                    app.use(path, middleware.resolve());
                });
            });
        });
    }
}