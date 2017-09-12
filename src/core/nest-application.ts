import iterate from 'iterare';
import { MiddlewaresModule } from './middlewares/middlewares-module';
import { SocketModule } from '@nestjs/websockets/socket-module';
import { NestContainer } from './injector/container';
import { ExpressAdapter } from './adapters/express-adapter';
import { RoutesResolver } from './router/routes-resolver';
import { Logger } from '@nestjs/common/services/logger.service';
import { messages } from './constants';
import { MicroservicesModule } from '@nestjs/microservices/microservices-module';
import { Resolver } from './router/interfaces/resolver.interface';
import { INestApplication, INestMicroservice, OnModuleInit } from '@nestjs/common';
import { ApplicationConfig } from './application-config';
import { validatePath, isNil, isUndefined } from '@nestjs/common/utils/shared.utils';
import { MicroserviceConfiguration } from '@nestjs/microservices';
import { NestMicroservice } from './index';
import { WebSocketAdapter, OnModuleDestroy, ExceptionFilter, PipeTransform } from '@nestjs/common';
import { Module } from './injector/module';

export class NestApplication implements INestApplication {
    private readonly config = new ApplicationConfig();
    private readonly logger = new Logger(NestApplication.name);
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
        MicroservicesModule.setup(this.container);
        MicroservicesModule.setupClients(this.container);
        await MiddlewaresModule.setup(this.container, this.config);
    }

    public async init() {
        await this.setupModules();

        const router = ExpressAdapter.createRouter();
        await this.setupMiddlewares(router);
        this.setupRoutes(router);

        this.express.use(validatePath(this.config.getGlobalPrefix()), router);
        this.callInitHook();

        this.logger.log(messages.APPLICATION_READY);
        this.isInitialized = true;
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

    public async listen(port: number, callback?: () => void) {
        (!this.isInitialized) && await this.init();

        this.server = this.express.listen(port, callback);
        return this.server;
    }

    public listenAsync(port: number): Promise<any> {
        return new Promise((resolve) => {
            const server = this.listen(port, () => resolve(server));
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

    private async setupMiddlewares(instance) {
        await MiddlewaresModule.setupMiddlewares(instance);
    }

    private setupRoutes(instance) {
        this.routesResolver.resolve(instance);
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