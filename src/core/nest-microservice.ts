import { CustomTransportStrategy } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices/enums/transport.enum';
import { MicroserviceConfiguration } from '@nestjs/microservices/interfaces/microservice-configuration.interface';
import { MicroservicesModule } from '@nestjs/microservices/microservices-module';
import { Server } from '@nestjs/microservices/server/server';
import { ServerFactory } from '@nestjs/microservices/server/server-factory';
import { SocketModule } from '@nestjs/websockets/socket-module';
import iterate from 'iterare';
import { ApplicationConfig } from './application-config';
import { messages } from './constants';
import { NestContainer } from './injector/container';
import { Module } from './injector/module';
import { CanActivate } from './interfaces/can-activate.interface';
import { ExceptionFilter } from './interfaces/exceptions/exception-filter.interface';
import { OnModuleDestroy } from './interfaces/modules/on-destroy.interface';
import { NestInterceptor } from './interfaces/nest-interceptor.interface';
import { INestMicroservice } from './interfaces/nest-microservice.interface';
import { PipeTransform } from './interfaces/pipe-transform.interface';
import { WebSocketAdapter } from './interfaces/web-socket-adapter.interface';
import { Logger } from './services/logger.service';
import { isNil, isUndefined } from './utils/shared.utils';

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
