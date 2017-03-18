import { NestContainer } from './core/injector/container';
import { MicroservicesModule } from './microservices/microservices-module';
import { messages } from './core/constants';
import { Logger } from './common/services/logger.service';
import { Server } from './microservices/server/server';
import { MicroserviceConfiguration } from './microservices/interfaces/microservice-configuration.interface';
import { ServerFactory } from './microservices/server/server-factory';
import { Transport } from './common/enums/transport.enum';

export class NestMicroservice {
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

    setupModules() {
        MicroservicesModule.setupClients(this.container);
        MicroservicesModule.setupListeners(this.container, this.server);
    }

    listen(callback: () => void) {
        this.logger.log(messages.APPLICATION_READY);
        this.server.listen(callback);
    }
}