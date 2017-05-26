import { NestContainer } from './injector/container';
import { MicroservicesModule } from '@nestjs/microservices/microservices-module';
import { messages } from './constants';
import { Logger } from '@nestjs/common/services/logger.service';
import { Server } from '@nestjs/microservices/server/server';
import { MicroserviceConfiguration } from '@nestjs/microservices/interfaces/microservice-configuration.interface';
import { ServerFactory } from '@nestjs/microservices/server/server-factory';
import { Transport } from '@nestjs/microservices/enums/transport.enum';
import { INestMicroservice } from '@nestjs/common';

export class NestMicroservice implements INestMicroservice {
    private readonly logger = new Logger(NestMicroservice.name);
    private readonly server: Server;
    private readonly config: MicroserviceConfiguration;

    constructor(
        private container: NestContainer,
        config: MicroserviceConfiguration) {

        this.config = {
            transport: Transport.TCP,
            ...config,
        };
        this.server = ServerFactory.create(this.config);
    }

    public setupModules() {
        MicroservicesModule.setupClients(this.container);
        this.setupListeners();
    }

    public setupListeners() {
        MicroservicesModule.setupListeners(this.container, this.server);
    }

    public listen(callback: () => void) {
        this.logger.log(messages.MICROSERVICE_READY);
        this.server.listen(callback);
    }

    public close() {
        this.server.close();
    }
}