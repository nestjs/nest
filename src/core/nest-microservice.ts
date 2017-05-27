import { NestContainer } from './injector/container';
import { MicroservicesModule } from '@nestjs/microservices/microservices-module';
import { messages } from './constants';
import { Logger } from '@nestjs/common/services/logger.service';
import { Server } from '@nestjs/microservices/server/server';
import { MicroserviceConfiguration } from '@nestjs/microservices/interfaces/microservice-configuration.interface';
import { ServerFactory } from '@nestjs/microservices/server/server-factory';
import { Transport } from '@nestjs/microservices/enums/transport.enum';
import { INestMicroservice, WebSocketAdapter } from '@nestjs/common';
import { ApplicationConfig } from './application-config';
import { SocketModule } from '@nestjs/websockets/socket-module';

export class NestMicroservice implements INestMicroservice {
    private readonly config = new ApplicationConfig();
    private readonly logger = new Logger(NestMicroservice.name);
    private readonly server: Server;
    private readonly microserviceConfig: MicroserviceConfiguration;
    private isInitialized = false;

    constructor(
        private container: NestContainer,
        config: MicroserviceConfiguration) {

        this.microserviceConfig = {
            transport: Transport.TCP,
            ...config,
        };
        this.server = ServerFactory.create(this.microserviceConfig);
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

    public listen(callback: () => void) {
        (!this.isInitialized) && this.setupModules();

        this.logger.log(messages.MICROSERVICE_READY);
        this.server.listen(callback);
    }

    public close() {
        SocketModule.close();
        this.server.close();
    }

    public setIsInitialized(isInitialized: boolean) {
        this.isInitialized = isInitialized;
    }
}