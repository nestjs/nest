/// <reference types="express" />
import { Application } from 'express';
import { NestContainer, InstanceWrapper } from '../injector/container';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Resolver } from './interfaces/resolver.interface';
import { ApplicationConfig } from './../application-config';
export declare class RoutesResolver implements Resolver {
    private readonly container;
    private readonly expressAdapter;
    private readonly config;
    private readonly logger;
    private readonly routerProxy;
    private readonly routerExceptionsFilter;
    private readonly routerBuilder;
    constructor(container: NestContainer, expressAdapter: any, config: ApplicationConfig);
    resolve(router: any, express: Application): void;
    setupRouters(routes: Map<string, InstanceWrapper<Controller>>, moduleName: string, modulePath: string, express: Application): void;
    setupNotFoundHandler(express: Application): void;
    setupExceptionHandler(express: Application): void;
}
