import * as http from 'http';
import * as optional from 'optional';
import * as bodyParser from 'body-parser';
import iterate from 'iterare';
import {
    CanActivate,
    ExceptionFilter,
    NestInterceptor,
    OnModuleDestroy,
    PipeTransform,
    WebSocketAdapter,
    } from '@nestjs/common';
import { INestApplication, INestMicroservice, OnModuleInit } from '@nestjs/common';
import { Logger } from '@nestjs/common/services/logger.service';
import { isNil, isUndefined, validatePath } from '@nestjs/common/utils/shared.utils';
import { MicroserviceConfiguration } from '@nestjs/common/interfaces/microservices/microservice-configuration.interface';
import { ExpressAdapter } from './adapters/express-adapter';
import { ApplicationConfig } from './application-config';
import { messages } from './constants';
import { NestContainer } from './injector/container';
import { Module } from './injector/module';
import { MiddlewaresModule } from './middlewares/middlewares-module';
import { Resolver } from './router/interfaces/resolver.interface';
import { RoutesResolver } from './router/routes-resolver';
import { MicroservicesPackageNotFoundException } from './errors/exceptions/microservices-package-not-found.exception';
import { MiddlewaresContainer } from './middlewares/container';
import { NestApplicationContext } from './nest-application-context';

const { SocketModule } = optional('@nestjs/websockets/socket-module') || {} as any;
const { MicroservicesModule } = optional('@nestjs/microservices/microservices-module') || {} as any;
const { NestMicroservice } = optional('@nestjs/microservices/nest-microservice') || {} as any;
const { IoAdapter } = optional('@nestjs/websockets/adapters/io-adapter') || {} as any;

export class NestApplication extends NestApplicationContext implements INestApplication {
    private readonly logger = new Logger(NestApplication.name, true);
    private readonly middlewaresModule = new MiddlewaresModule();
    private readonly middlewaresContainer = new MiddlewaresContainer();
    private readonly microservicesModule = MicroservicesModule
        ? new MicroservicesModule()
        : null;
    private readonly socketModule = SocketModule
        ? new SocketModule()
        : null;

    private readonly httpServer: http.Server = null;
    private readonly routesResolver: Resolver = null;
    private readonly config: ApplicationConfig;
    private readonly microservices = [];
    private isInitialized = false;

    constructor(container: NestContainer, private readonly express) {
        super(container, [], null);

        const modules = this.container.getModules().values();
        this.contextModule = modules.next().value;
        this.httpServer = http.createServer(express);

        const ioAdapter = IoAdapter ? new IoAdapter(this.httpServer) : null;
        this.config = new ApplicationConfig(ioAdapter);
        this.routesResolver = new RoutesResolver(
            container, ExpressAdapter, this.config,
        );
    }

    public async setupModules() {
        this.socketModule && this.socketModule.setup(this.container, this.config);

        if (this.microservicesModule) {
            this.microservicesModule.setup(this.container, this.config);
            this.microservicesModule.setupClients(this.container);
        }
        await this.middlewaresModule.setup(
            this.middlewaresContainer,
            this.container,
            this.config,
        );
    }

    public async init() {
        this.setupParserMiddlewares();

        await this.setupModules();
        await this.setupRouter();

        this.callInitHook();
        this.logger.log(messages.APPLICATION_READY);
        this.isInitialized = true;
    }

    public setupParserMiddlewares() {
        const parserMiddlewares = {
            jsonParser: bodyParser.json(),
            urlencodedParser: bodyParser.urlencoded({ extended: true }),
        };
        Object.keys(parserMiddlewares)
            .filter((parser) => !this.isMiddlewareApplied(this.express, parser))
            .forEach((parserKey) => this.express.use(parserMiddlewares[parserKey]));
    }

    public isMiddlewareApplied(app, name: string): boolean {
        return !!app._router && !!app._router.stack.filter(
            (layer) => layer && layer.handle && layer.handle.name === name,
        ).length;
    }

    public async setupRouter() {
        const router = ExpressAdapter.createRouter();
        await this.setupMiddlewares(router);

        this.routesResolver.resolve(router);
        this.express.use(validatePath(this.config.getGlobalPrefix()), router);
    }

    public connectMicroservice(config: MicroserviceConfiguration): INestMicroservice {
        if (!NestMicroservice) {
            throw new MicroservicesPackageNotFoundException();
        }
        const instance = new NestMicroservice(this.container as any, config as any);
        instance.setupListeners();
        instance.setIsInitialized(true);
        instance.setIsInitHookCalled(true);

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

    public use(...args) {
        this.express.use(...args);
    }

    public set(...args) {
        this.express.set(...args);
    }

    public async listen(port: number, callback?: () => void);
    public async listen(port: number, hostname: string, callback?: () => void);
    public async listen(port: number, ...args) {
        (!this.isInitialized) && await this.init();

        this.httpServer.listen(port, ...args);
        return this.httpServer;
    }

    public listenAsync(port: number, hostname?: string): Promise<any> {
        return new Promise((resolve) => {
            const server = this.listen(port, hostname, () => resolve(server));
        });
    }

    public close() {
        this.socketModule && this.socketModule.close();
        this.httpServer && this.httpServer.close();
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
        await this.middlewaresModule.setupMiddlewares(this.middlewaresContainer, instance);
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