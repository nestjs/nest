import { Application } from 'express';
import { MiddlewaresModule } from './core/middlewares/middlewares-module';
import { SocketModule } from './websockets/socket-module';
import { NestContainer } from './core/injector/container';
import { ExpressAdapter } from './core/adapters/express-adapter';
import { RoutesResolver } from './core/router/routes-resolver';
import { Logger } from './common/services/logger.service';
import { messages } from './core/constants';
import { MicroservicesModule } from './microservices/microservices-module';

export class NestApplication {
    private readonly routesResolver: RoutesResolver;
    private readonly logger = new Logger(NestApplication.name);

    constructor(
        private readonly container: NestContainer,
        private readonly express: Application) {

        this.routesResolver = new RoutesResolver(container, ExpressAdapter);
    }

    setupModules() {
        SocketModule.setup(this.container);
        MiddlewaresModule.setup(this.container);
        MicroservicesModule.setupClients(this.container);
    }

    listen(port: number, callback: () => void) {
        this.setupMiddlewares(this.express);
        this.setupRoutes(this.express);

        this.logger.log(messages.APPLICATION_READY);
        return this.express.listen(port, callback);
    }

    private setupMiddlewares(instance: Application) {
        MiddlewaresModule.setupMiddlewares(instance);
    }

    private setupRoutes(instance: Application) {
        this.routesResolver.resolve(instance);
    }
}