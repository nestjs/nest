import iterate from 'iterare';
import { NestContainer } from './injector/container';
import { MicroservicesModule } from '@nestjs/microservices/microservices-module';
import { messages } from './constants';
import { Logger } from '@nestjs/common/services/logger.service';
import { Server } from '@nestjs/microservices/server/server';
import { MicroserviceConfiguration } from '@nestjs/microservices/interfaces/microservice-configuration.interface';
import { ServerFactory } from '@nestjs/microservices/server/server-factory';
import { Transport } from '@nestjs/microservices/enums/transport.enum';
import { INestMicroservice, WebSocketAdapter, CanActivate, PipeTransform, NestInterceptor, ExceptionFilter, OnModuleInit } from '@nestjs/common';
import { ApplicationConfig } from './application-config';
import { SocketModule } from '@nestjs/websockets/socket-module';
import { CustomTransportStrategy } from '@nestjs/microservices';
import { Module } from './injector/module';
import { isNil, isUndefined } from '@nestjs/common/utils/shared.utils';
import { OnModuleDestroy } from '@nestjs/common/interfaces';

export class NestMicroservice implements INestMicroservice {
    private readonly config = new ApplicationConfig();
    private readonly logger = new Logger(NestMicroservice.name, true);
    private readonly microserviceConfig: MicroserviceConfiguration;
    private readonly server: Server & CustomTransportStrategy;
    private isTerminated = false;
    private isInitialized = false;
    private isInitHookCalled = false;

    constructor(
        private container: NestContainer,
        config: MicroserviceConfiguration = {}) {

        MicroservicesModule.setup(container, this.config);
        this.microserviceConfig = {
            transport: Transport.TCP,
            ...config,
        };
        const { strategy } = config;
        this.server = strategy ? strategy : ServerFactory.create(this.microserviceConfig);
    }

    public setupModules() {
        SocketModule.setup(this.container, this.config);
        MicroservicesModule.setupClients(this.container);

        this.setupListeners();
        this.setIsInitialized(true);

        !this.isInitHookCalled && this.callInitHook();
    }

    public setupListeners() {
        MicroservicesModule.setupListeners(this.container, this.server);
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
        SocketModule.close();

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