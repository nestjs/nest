import { NestContainer } from '../injector/container';
import { MiddlewaresContainer } from './container';
import { ControllerMetadata } from '@nestjs/common/interfaces/controllers/controller-metadata.interface';
import { NestModule } from '@nestjs/common/interfaces/modules/nest-module.interface';
import { MiddlewareConfiguration } from '@nestjs/common/interfaces/middlewares/middleware-configuration.interface';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { Module } from '../injector/module';
import { ApplicationConfig } from './../application-config';
export declare class MiddlewaresModule {
    private readonly routesMapper;
    private readonly routerProxy;
    private readonly routerMethodFactory;
    private routerExceptionFilter;
    private resolver;
    setup(middlewaresContainer: MiddlewaresContainer, container: NestContainer, config: ApplicationConfig): Promise<void>;
    resolveMiddlewares(middlewaresContainer: MiddlewaresContainer, modules: Map<string, Module>): Promise<void>;
    loadConfiguration(middlewaresContainer: MiddlewaresContainer, instance: NestModule, module: string): void;
    setupMiddlewares(middlewaresContainer: MiddlewaresContainer, app: any): Promise<void>;
    setupMiddlewareConfig(middlewaresContainer: MiddlewaresContainer, config: MiddlewareConfiguration, module: string, app: any): Promise<void>;
    setupRouteMiddleware(middlewaresContainer: MiddlewaresContainer, route: ControllerMetadata & {
        method: RequestMethod;
    }, config: MiddlewareConfiguration, module: string, app: any): Promise<void>;
    private setupHandler(instance, metatype, app, method, path);
    private setupHandlerWithProxy(exceptionsHandler, router, middleware, path);
}
