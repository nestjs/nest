import { MiddlewaresModule } from './middlewares/middlewares-module';
import { SocketModule } from '@nestjs/websockets/socket-module';
import { NestContainer } from './injector/container';
import { ExpressAdapter } from './adapters/express-adapter';
import { RoutesResolver } from './router/routes-resolver';
import { Logger } from '@nestjs/common/services/logger.service';
import { messages } from './constants';
import { MicroservicesModule } from '@nestjs/microservices/microservices-module';
import { Resolver } from './router/interfaces/resolver.interface';
import { INestApplication } from '@nestjs/common';

export class NestApplication implements INestApplication {
    private readonly routesResolver: Resolver;
    private readonly logger = new Logger(NestApplication.name);

    constructor(
        private readonly container: NestContainer,
        private readonly express) {

        this.routesResolver = new RoutesResolver(container, ExpressAdapter);
    }

    public setupModules() {
        SocketModule.setup(this.container);
        MiddlewaresModule.setup(this.container);
        MicroservicesModule.setupClients(this.container);
    }

    public listen(port: number, callback?: () => void) {
        this.setupMiddlewares(this.express);
        this.setupRoutes(this.express);

        this.logger.log(messages.APPLICATION_READY);
        return this.express.listen(port, callback);
    }

    private setupMiddlewares(instance) {
        MiddlewaresModule.setupMiddlewares(instance);
    }

    private setupRoutes(instance) {
        this.routesResolver.resolve(instance);
    }
}