import * as optional from 'optional';
import iterate from 'iterare';
import { NestContainer } from '@nestjs/core/injector/container';
import { MicroservicesModule } from './microservices-module';
import { messages } from '@nestjs/core/constants';
import { Logger } from '@nestjs/common/services/logger.service';
import { Server } from './server/server';
import { MicroserviceConfiguration } from './interfaces/microservice-configuration.interface';
import { ServerFactory } from './server/server-factory';
import { Transport } from './enums/transport.enum';
import { INestMicroservice, WebSocketAdapter, CanActivate, PipeTransform, NestInterceptor, ExceptionFilter, OnModuleInit } from '@nestjs/common';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { CustomTransportStrategy } from '@nestjs/microservices';
import { Module } from '@nestjs/core/injector/module';
import { isNil, isUndefined } from '@nestjs/common/utils/shared.utils';
import { OnModuleDestroy } from '@nestjs/common/interfaces';

const { SocketModule } = optional('@nestjs/websockets/socket-module') || {} as any;
const { IoAdapter } = optional('@nestjs/websockets/adapters/io-adapter') || {} as any;

export class NestMicroservice implements INestMicroservice {
    private readonly logger = new Logger(NestMicroservice.name, true);
    private readonly microservicesModule = new MicroservicesModule();
    private readonly socketModule = SocketModule
      ? new SocketModule()
      : null;

    private readonly microserviceConfig: MicroserviceConfiguration;
    private readonly server: Server & CustomTransportStrategy;
    private readonly config: ApplicationConfig;
    private isTerminated = false;
    private isInitialized = false;
    private isInitHookCalled = false;

    constructor(
        private readonly container: NestContainer,
        config: MicroserviceConfiguration = {},
    ) {
        const ioAdapter = IoAdapter ? new IoAdapter() : null;
        this.config = new ApplicationConfig(ioAdapter);

        this.microservicesModule.setup(container, this.config);
        this.microserviceConfig = {
            transport: Transport.TCP,
            ...config,
        };
        const { strategy } = config;
        this.server = strategy ? strategy : ServerFactory.create(this.microserviceConfig);
    }

    public setupModules() {
        this.socketModule && this.socketModule.setup(this.container, this.config);
        this.microservicesModule.setupClients(this.container);

        this.setupListeners();
        this.setIsInitialized(true);

        !this.isInitHookCalled && this.callInitHook();
    }

    public setupListeners() {
        this.microservicesModule.setupListeners(this.container, this.server);
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

    public listen(callback: () => void) {
        (!this.isInitialized) && this.setupModules();

        this.logger.log(messages.MICROSERVICE_READY);
        this.server.listen(callback);
    }

    public close() {
        this.server.close();
        !this.isTerminated && this.closeApplication();
    }

    public setIsInitialized(isInitialized: boolean) {
        this.isInitialized = isInitialized;
    }

    public setIsTerminated(isTerminaed: boolean) {
        this.isTerminated = isTerminaed;
    }

    public setIsInitHookCalled(isInitHookCalled: boolean) {
        this.isInitHookCalled = isInitHookCalled;
    }

    private closeApplication() {
        this.socketModule && this.socketModule.close();

        this.callDestroyHook();
        this.setIsTerminated(true);
    }

    private callInitHook() {
        const modules = this.container.getModules();
        modules.forEach((module) => {
            this.callModuleInitHook(module);
        });
        this.setIsInitHookCalled(true);
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