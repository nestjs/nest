import { Application } from "express";
import { NestContainer, ModuleDependencies } from "../injector/container";
import { MiddlewareBuilder } from "./builder";
import { MiddlewaresContainer } from "./container";
import { MiddlewaresResolver } from "./resolver";
import { ControllerMetadata } from "../../common/interfaces/controller-metadata.interface";
import { NestModule } from "../../common/interfaces/nest-module.interface";
import { MiddlewareConfiguration } from "./interfaces/middleware-configuration.interface";
import { UnkownMiddlewareException } from "../../errors/exceptions/unkown-middleware.exception";
import { InvalidMiddlewareException } from "../../errors/exceptions/invalid-middleware.exception";
import { RequestMethod } from "../../common/enums/request-method.enum";
import { RoutesMapper } from "./routes-mapper";

export class MiddlewaresModule {
    private static container = new MiddlewaresContainer(new RoutesMapper());
    private static resolver: MiddlewaresResolver;

    static getContainer(): MiddlewaresContainer {
        return this.container;
    }

    static setup(container: NestContainer) {
        this.resolver = new MiddlewaresResolver(this.container);

        const modules = container.getModules();
        this.resolveMiddlewares(modules);
    }

    static resolveMiddlewares(modules: Map<NestModule, ModuleDependencies>) {
        modules.forEach((module, moduleProto) => {
            const instance = module.instance;

            this.loadConfiguration(instance, moduleProto);
            this.resolver.resolveInstances(module, moduleProto);
        });
    }

    static loadConfiguration(instance, module: NestModule) {
        if (!instance.configure) {
            return;
        }

        const middlewaresBuilder = new MiddlewareBuilder();
        instance.configure(middlewaresBuilder);

        if (middlewaresBuilder instanceof MiddlewareBuilder) {
            const config = middlewaresBuilder.build();
            this.container.addConfig(config, module);
        }
    }

    static setupMiddlewares(app: Application) {
        const configs = this.container.getConfigs();

        configs.forEach((moduleConfigs, module) => {
            [ ...moduleConfigs ].map((config: MiddlewareConfiguration) => {

                config.forRoutes.map((route: ControllerMetadata & { method: RequestMethod }) => {
                    this.setupRouteMiddleware(route, config, module, app);
                });
            });
        });
    }

    static setupRouteMiddleware(
        route: ControllerMetadata & { method: RequestMethod },
        config: MiddlewareConfiguration,
        module: NestModule,
        app: Application) {

        const { path, method } = route;

        [].concat(config.middlewares).map((middlewareType) => {
            const middlewaresCollection = this.container.getMiddlewares(module);
            const middleware = middlewaresCollection.get(middlewareType);

            if (typeof middleware === "undefined") {
                throw new UnkownMiddlewareException();
            }
            if (typeof middleware.resolve === "undefined") {
                throw new InvalidMiddlewareException();
            }
            const router = this.findRouterMethod(app, method).bind(app);
            router(path, middleware.resolve());
        });
    }

    private static findRouterMethod(app, requestMethod: RequestMethod) {
        switch(requestMethod) {
            case RequestMethod.POST: { return app.post; }
            case RequestMethod.ALL: { return app.all; }
            case RequestMethod.DELETE: { return app.delete; }
            case RequestMethod.PUT: { return app.put; }
            default: {
                return app.get;
            }
        }
    }
}