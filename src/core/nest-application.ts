import {
    CanActivate,
    ExceptionFilter,
    NestInterceptor,
    OnModuleDestroy,
    PipeTransform,
    WebSocketAdapter
    } from '@nestjs/common';
import { INestApplication, INestMicroservice, OnModuleInit } from '@nestjs/common';
import { Logger } from '@nestjs/common/services/logger.service';
import { isNil, isUndefined, validatePath } from '@nestjs/common/utils/shared.utils';
import { MicroserviceConfiguration } from '@nestjs/microservices';
import { MicroservicesModule } from '@nestjs/microservices/microservices-module';
import { SocketModule } from '@nestjs/websockets/socket-module';
import iterate from 'iterare';
import { ExpressAdapter } from './adapters/express-adapter';
import { ApplicationConfig } from './application-config';
import { messages } from './constants';
import { NestMicroservice } from './index';
import { NestContainer } from './injector/container';
import { Module } from './injector/module';
import { MiddlewaresModule } from './middlewares/middlewares-module';
import { Resolver } from './router/interfaces/resolver.interface';
import { RoutesResolver } from './router/routes-resolver';

export class NestApplication implements INestApplication {
    private readonly config = new ApplicationConfig();
    private readonly logger = new Logger(NestApplication.name, true);
    private readonly routesResolver: Resolver = null;
    private readonly microservices = [];
    private isInitialized = false;
    private server = null;

    constructor(
        private readonly container: NestContainer,
        private readonly express) {

        this.routesResolver = new RoutesResolver(
            container, ExpressAdapter, this.config,
        );
    }

    public async setupModules() {
        SocketModule.setup(this.container, this.config);
        MicroservicesModule.setup(this.container, this.config);
        MicroservicesModule.setupClients(this.container);
        await MiddlewaresModule.setup(this.container, this.config);
    }

    public async init() {
        await this.setupModules();
        await this.setupRouter();

        this.callInitHook();
        this.logger.log(messages.APPLICATION_READY);
        this.isInitialized = true;
    }

    public async setupRouter() {
      const router = ExpressAdapter.createRouter();
      await this.setupMiddlewares(router);

      this.routesResolver.resolve(router);
      this.express.use(validatePath(this.config.getGlobalPrefix()), router);
    }

    public connectMicroservice(config: MicroserviceConfiguration): INestMicroservice {
        const instance = new NestMicroservice(this.container, config);
        instance.setupListeners();
        instance.setIsInitialized(true);

        this.microservices.push(instance);
        return instance;
    }

    public getMicroservices(): INestMicroservice[] {
        return this.microservices;
    }

    public startAllMicroservices(callback?: () => void) {
        Promise.all(
            this.microservices.map(this.listenToPromise),
        ).then(() => callback && callback());
    }

    public startAllMicroservicesAsync(): Promise<void> {
        return new Promise((resolve) => this.startAllMicroservices(resolve));
    }

    public use(requestHandler) {
        this.express.use(requestHandler);
    }

    public async listen(port: number, callback?: () => void);
    public async listen(port: number, hostname: string, callback?: () => void);
    public async listen(port: number, ...args) {
        (!this.isInitialized) && await this.init();

        this.server = this.express.listen(port, ...args);
        return this.server;
    }

    public listenAsync(port: number, hostname?: string): Promise<any> {
        return new Promise((resolve) => {
            const server = this.listen(port, hostname, () => resolve(server));
        });
    }

    public close() {
        SocketModule.close();
        this.server && this.server.close();
        this.microservices.forEach((microservice) => {
            microservice.setIsTerminated(true);
            microservice.close();
        });
        this.callDestroyHook();
    }

    public setGlobalPrefix(prefix: string) {
        this.config.setGlobalPrefix(prefix);
    }

    public useWebSocketAdapter(adapter: WebSocketAdapter) {
        this.config.setIoAdapter(adapter);
    }

    public useGlobalFilters(...filters: ExceptionFilter[]) {
        this.config.useGlobalFilters(...filters);
    }

    public useGlobalPipes(...pipes: PipeTransform<any>[]) {
        this.config.useGlobalPipes(...pipes);
    }

    public useGlobalInterceptors(...interceptors: NestInterceptor[]) {
        this.config.useGlobalInterceptors(...interceptors);
    }

    public useGlobalGuards(...guards: CanActivate[]) {
        this.config.useGlobalGuards(...guards);
    }

    private async setupMiddlewares(instance) {
        await MiddlewaresModule.setupMiddlewares(instance);
    }

    private listenToPromise(microservice: INestMicroservice) {
        return new Promise(async (resolve, reject) => {
            await microservice.listen(resolve);
        });
    }

    private callInitHook() {
        const modules = this.container.getModules();
        modules.forEach((module) => {
            this.callModuleInitHook(module);
        });
    }

    private callModuleInitHook(module: Module) {
        const components = [...module.routes, ...module.components];
        iterate(components).map(([key, {instance}]) => instance)
            .filter((instance) => !isNil(instance))
            .filter(this.hasOnModuleInitHook)
            .forEach((instance) => (instance as OnModuleInit).onModuleInit());
        }

    private hasOnModuleInitHook(instance): instance is OnModuleInit {
        return !isUndefined((instance as OnModuleInit).onModuleInit);
    }

    private callDestroyHook() {
        const modules = this.container.getModules();
        modules.forEach((module) => {
            this.callModuleDestroyHook(module);
        });
    }

    private callModuleDestroyHook(module: Module) {
        const components = [...module.routes, ...module.components];
        iterate(components).map(([key, {instance}]) => instance)
                .filter((instance) => !isNil(instance))
                .filter(this.hasOnModuleDestroyHook)
                .forEach((instance) => (instance as OnModuleDestroy).onModuleDestroy());
    }

    private hasOnModuleDestroyHook(instance): instance is OnModuleDestroy {
        return !isUndefined((instance as OnModuleDestroy).onModuleDestroy);
    }
}
