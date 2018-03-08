import { NestContainer } from '../injector/container';
import { MiddlewaresContainer } from './container';
import { NestModule } from '@nestjs/common/interfaces/modules/nest-module.interface';
import { MiddlewareConfiguration } from '@nestjs/common/interfaces/middlewares/middleware-configuration.interface';
import { Module } from '../injector/module';
import { ApplicationConfig } from './../application-config';
export declare class MiddlewaresModule {
    private readonly routerProxy;
    private readonly routerMethodFactory;
    private routerExceptionFilter;
    private routesMapper;
    private resolver;
    register(middlewaresContainer: MiddlewaresContainer, container: NestContainer, config: ApplicationConfig): Promise<void>;
    resolveMiddlewares(middlewaresContainer: MiddlewaresContainer, modules: Map<string, Module>): Promise<void>;
    loadConfiguration(middlewaresContainer: MiddlewaresContainer, instance: NestModule, module: string): void;
    registerMiddlewares(middlewaresContainer: MiddlewaresContainer, app: any): Promise<void>;
    registerMiddlewareConfig(middlewaresContainer: MiddlewaresContainer, config: MiddlewareConfiguration, module: string, app: any): Promise<void>;
    registerRouteMiddleware(middlewaresContainer: MiddlewaresContainer, routePath: string, config: MiddlewareConfiguration, module: string, app: any): Promise<void>;
    private setupHandler(instance, metatype, app, method, path);
    private setupHandlerWithProxy(exceptionsHandler, router, middleware, path);
}
