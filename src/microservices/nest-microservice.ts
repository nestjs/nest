import { Module } from '@nestjs/core/injector/module';
import { CanActivate, ExceptionFilter, INestMicroservice, Logger, NestInterceptor, OnModuleDestroy, PipeTransform, WebSocketAdapter } from '@nestjs/core';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { messages } from '@nestjs/core/constants';
import { NestContainer } from '@nestjs/core/injector/container';
import { isNil, isUndefined } from '@nestjs/core/utils/shared.utils';
import { SocketModule } from '@nestjs/websockets/socket-module';
import iterate from 'iterare';
import { Transport } from './enums/transport.enum';
import { CustomTransportStrategy } from './interfaces/custom-transport-strategy.interface';
import { MicroserviceConfiguration } from './interfaces/microservice-configuration.interface';
import { MicroservicesModule } from './microservices-module';
import { Server } from './server/server';
import { ServerFactory } from './server/server-factory';


export class NestMicroservice implements INestMicroservice {
    private readonly config = new ApplicationConfig();
    private readonly logger = new Logger(NestMicroservice.name, true);
    private readonly microserviceConfig: MicroserviceConfiguration;
    private readonly server: Server & CustomTransportStrategy;
    private isTerminated = false;
    private isInitialized = false;

    constructor(
        private container: NestContainer,
        config: MicroserviceConfiguration) {

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

        this.isInitialized = true;
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

    private closeApplication() {
        SocketModule.close();
        this.callDestroyHook();
        this.setIsTerminated(true);
    }

    private callDestroyHook() {
        const modules = this.container.getModules();
        modules.forEach((module) => {
            this.callModuleDestroyHook(module);
        });
    }

    private callModuleDestroyHook(module: Module) {
        const components = [...module.routes, ...module.components];
        iterate(components).map(([key, { instance }]) => instance)
            .filter((instance) => !isNil(instance))
            .filter(this.hasOnModuleDestroyHook)
            .forEach((instance) => (instance as OnModuleDestroy).onModuleDestroy());
    }

    private hasOnModuleDestroyHook(instance): instance is OnModuleDestroy {
        return !isUndefined((instance as OnModuleDestroy).onModuleDestroy);
    }
}
