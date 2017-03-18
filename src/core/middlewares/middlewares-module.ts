import { Application } from 'express';
import { NestContainer } from '../injector/container';
import { MiddlewareBuilder } from './builder';
import { MiddlewaresContainer, MiddlewareWrapper } from './container';
import { MiddlewaresResolver } from './resolver';
import { ControllerMetadata } from '../../common/interfaces/controller-metadata.interface';
import { NestModule } from '../../common/interfaces/nest-module.interface';
import { MiddlewareConfiguration } from './interfaces/middleware-configuration.interface';
import { InvalidMiddlewareException } from '../../errors/exceptions/invalid-middleware.exception';
import { RequestMethod } from '../../common/enums/request-method.enum';
import { RoutesMapper } from './routes-mapper';
import { RouterProxy } from '../router/router-proxy';
import { ExceptionsHandler } from '../exceptions/exceptions-handler';
import { Module } from '../injector/module';
import { isUndefined } from 'util';
import { RouterMethodFactory } from '../helpers/router-method-factory';
import { NestMiddleware } from './interfaces/nest-middleware.interface';
import { Metatype } from '../../common/interfaces/metatype.interface';
import { RuntimeException } from '../../errors/exceptions/runtime.exception';

export class MiddlewaresModule {
    private static container = new MiddlewaresContainer(new RoutesMapper());
    private static resolver: MiddlewaresResolver;
    private static routerProxy = new RouterProxy(new ExceptionsHandler());
    private static routerMethodFactory = new RouterMethodFactory();

    static getContainer(): MiddlewaresContainer {
        return this.container;
    }

    static setup(container: NestContainer) {
        this.resolver = new MiddlewaresResolver(this.container);

        const modules = container.getModules();
        this.resolveMiddlewares(modules);
    }

    static resolveMiddlewares(modules: Map<string, Module>) {
        modules.forEach((module, name) => {
            const instance = module.instance;

            this.loadConfiguration(instance, name);
            this.resolver.resolveInstances(module, name);
        });
    }

    static loadConfiguration(instance: NestModule, module: string) {
        if (!instance.configure) { return; }

        const middlewaresBuilder = new MiddlewareBuilder();
        instance.configure(middlewaresBuilder);

        if (middlewaresBuilder instanceof MiddlewareBuilder) {
            const config = middlewaresBuilder.build();
            this.container.addConfig(config, module);
        }
    }

    static setupMiddlewares(app: Application) {
        const configs = this.container.getConfigs();

        configs.forEach((moduleConfigs, module: string) => {
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
        module: string,
        app: Application) {

        const { path, method } = route;

        [].concat(config.middlewares).map((middlewareMetatype) => {
            const collection = this.container.getMiddlewares(module);
            const middleware: MiddlewareWrapper = collection.get(middlewareMetatype.name);
            if (isUndefined(middleware)) {
                throw new RuntimeException();
            }

            const instance = middleware.instance;
            this.setupHandler(instance, middlewareMetatype, app, method, path);
        });
    }

    private static setupHandler(
        instance: NestMiddleware,
        metatype: Metatype<NestMiddleware>,
        app: Application,
        method: RequestMethod,
        path: string) {

        if (isUndefined(instance.resolve)) {
            throw new InvalidMiddlewareException(metatype.name);
        }
        const router = this.routerMethodFactory.get(app, method).bind(app);
        const proxy = this.routerProxy.createProxy(instance.resolve());

        router(path, proxy);
    }
}