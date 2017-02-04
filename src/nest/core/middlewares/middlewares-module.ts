import { Application } from "express";
import { NestContainer, ModuleDependencies } from "../injector/container";
import { MiddlewaresBuilder } from "./builder";
import { MiddlewaresContainer } from "./container";
import { MiddlewaresResolver } from "./resolver";
import { RouteProps } from "../../common/interfaces/route-props.interface";
import { NestModule } from "../../common/interfaces/nest-module.interface";
import { errorsMsg } from "../errors/error-messages";
import { MiddlewareConfiguration } from "./interfaces/middleware-configuration.interface";
import { Middleware } from "./interfaces/middleware.interface";

export class MiddlewaresModule {
    private static container = new MiddlewaresContainer();
    private static resolver: MiddlewaresResolver;

    static setup(container: NestContainer) {
        const modules = container.getModules();
        this.resolver = new MiddlewaresResolver(this.container);
        this.resolveMiddlewares(modules);
    }

    private static resolveMiddlewares(modules: Map<NestModule, ModuleDependencies>) {
        modules.forEach((module) => {
            const instance = module.instance;

            this.loadConfiguration(instance);
            this.resolver.resolveInstances(module);
        });
    }

    static setupMiddlewares(app: Application) {
        const configs = this.container.getConfigs();

        configs.map((config: MiddlewareConfiguration) => {
            config.forRoutes.map((route: RouteProps) => {
                this.setupRouteMiddleware(route, config, app);
            });
        });
    }

    private static loadConfiguration(instance) {
        if (!instance["configure"]) {
            return;
        }

        const middlewaresBuilder = instance.configure(new MiddlewaresBuilder());
        if (middlewaresBuilder) {
            const config = middlewaresBuilder.build();
            this.container.addConfig(config);
        }
    }

    private static setupRouteMiddleware(route: RouteProps, config: MiddlewareConfiguration, app: Application) {
        const path = route.path;

        (<Middleware[]>config.middlewares).map((middlewareType) => {
            const middlewaresCollection = this.container.getMiddlewares();
            const middleware = middlewaresCollection.get(middlewareType);

            if (!middleware) {
                throw new Error(errorsMsg.unkownMiddleware);
            }
            app.use(path, middleware.resolve());
        });
    }
}