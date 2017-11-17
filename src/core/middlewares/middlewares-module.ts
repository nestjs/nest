import { NestContainer } from '../injector/container';
import { MiddlewareBuilder } from './builder';
import { MiddlewaresContainer, MiddlewareWrapper } from './container';
import { MiddlewaresResolver } from './resolver';
import { ControllerMetadata } from '@nestjs/common/interfaces/controllers/controller-metadata.interface';
import { NestModule } from '@nestjs/common/interfaces/modules/nest-module.interface';
import { MiddlewareConfiguration } from '@nestjs/common/interfaces/middlewares/middleware-configuration.interface';
import { InvalidMiddlewareException } from '../errors/exceptions/invalid-middleware.exception';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { RoutesMapper } from './routes-mapper';
import { RouterProxy } from '../router/router-proxy';
import { ExceptionsHandler } from '../exceptions/exceptions-handler';
import { Module } from '../injector/module';
import { RouterMethodFactory } from '../helpers/router-method-factory';
import { NestMiddleware } from '@nestjs/common/interfaces/middlewares/nest-middleware.interface';
import { Metatype } from '@nestjs/common/interfaces/metatype.interface';
import { RuntimeException } from '../errors/exceptions/runtime.exception';
import { isUndefined } from '@nestjs/common/utils/shared.utils';
import { ApplicationConfig } from './../application-config';
import { RouterExceptionFilters } from './../router/router-exception-filters';

export class MiddlewaresModule {
    private static readonly routesMapper = new RoutesMapper();
    private static readonly container = new MiddlewaresContainer();
    private static readonly routerProxy = new RouterProxy();
    private static readonly routerMethodFactory = new RouterMethodFactory();
    private static routerExceptionFilter: RouterExceptionFilters;
    private static resolver: MiddlewaresResolver;

    public static async setup(container: NestContainer, config: ApplicationConfig) {
        this.routerExceptionFilter = new RouterExceptionFilters(config);
        this.resolver = new MiddlewaresResolver(this.container);

        const modules = container.getModules();
        await this.resolveMiddlewares(modules);
    }

    public static getContainer(): MiddlewaresContainer {
        return this.container;
    }

    public static async resolveMiddlewares(modules: Map<string, Module>) {
        await Promise.all([...modules.entries()].map(async ([name, module]) => {
            const instance = module.instance;

            this.loadConfiguration(instance, name);
            await this.resolver.resolveInstances(module, name);
        }));
    }

    public static loadConfiguration(instance: NestModule, module: string) {
        if (!instance.configure) return;

        const middlewaresBuilder = new MiddlewareBuilder(this.routesMapper);
        instance.configure(middlewaresBuilder);
        if (!(middlewaresBuilder instanceof MiddlewareBuilder)) return;

        const config = middlewaresBuilder.build();
        this.container.addConfig(config, module);
    }

    public static async setupMiddlewares(app) {
        const configs = this.container.getConfigs();
        await Promise.all([...configs.entries()].map(async ([module, moduleConfigs]) => {
            await Promise.all([...moduleConfigs].map(async (config: MiddlewareConfiguration) => {
                await this.setupMiddlewareConfig(config, module, app);
            }));
        }));
    }

    public static async setupMiddlewareConfig(config: MiddlewareConfiguration, module: string, app) {
        const { forRoutes } = config;
        await Promise.all(forRoutes.map(async (route: ControllerMetadata & { method: RequestMethod }) => {
            await this.setupRouteMiddleware(route, config, module, app);
        }));
    }

    public static async setupRouteMiddleware(
        route: ControllerMetadata & { method: RequestMethod },
        config: MiddlewareConfiguration,
        module: string,
        app) {

        const { path, method } = route;

        const middlewares = [].concat(config.middlewares);
        await Promise.all(middlewares.map(async (metatype: Metatype<NestMiddleware>) => {
            const collection = this.container.getMiddlewares(module);
            const middleware = collection.get(metatype.name);
            if (isUndefined(middleware)) {
                throw new RuntimeException();
            }

            const { instance } = (middleware as MiddlewareWrapper);
            await this.setupHandler(instance, metatype, app, method, path);
        }));
    }

    private static async setupHandler(
        instance: NestMiddleware,
        metatype: Metatype<NestMiddleware>,
        app: any,
        method: RequestMethod,
        path: string) {

        if (isUndefined(instance.resolve)) {
            throw new InvalidMiddlewareException(metatype.name);
        }
        const exceptionsHandler = this.routerExceptionFilter.create(instance, instance.resolve);
        const router = this.routerMethodFactory.get(app, method).bind(app);

        const setupWithProxy = (middleware) => this.setupHandlerWithProxy(
            exceptionsHandler, router, middleware, path,
        );
        const resolve = instance.resolve();
        if (!(resolve instanceof Promise)) {
            setupWithProxy(resolve);
            return;
        }
        const middleware = await resolve;
        setupWithProxy(middleware);
    }

    private static setupHandlerWithProxy(
        exceptionsHandler: ExceptionsHandler,
        router: (...args) => void,
        middleware: (req, res, next) => void,
        path: string) {

        const proxy = this.routerProxy.createProxy(middleware, exceptionsHandler);
        router(path, proxy);
    }
}