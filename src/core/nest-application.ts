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
import { ApplicationConfig } from './application-config';
import { validatePath } from '@nestjs/common/utils/shared.utils';

export class NestApplication implements INestApplication {
    private readonly config = new ApplicationConfig();
    private readonly logger = new Logger(NestApplication.name);
    private readonly routesResolver: Resolver;

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

    public init() {
        const router = ExpressAdapter.createRouter();
        this.setupMiddlewares(router);
        this.setupRoutes(router);

        this.express.use(
            validatePath(this.config.getGlobalPrefix()),
            router,
        );

        this.logger.log(messages.APPLICATION_READY);
    }

    public listen(port: number, callback?: () => void) {
        const server = this.express.listen(port, () => {
            callback && callback.call(callback, server);
        });
    }

    public setGlobalPrefix(prefix: string) {
        this.config.setGlobalPrefix(prefix);
    }

    private setupMiddlewares(instance) {
        MiddlewaresModule.setupMiddlewares(instance);
    }

    private setupRoutes(instance) {
        this.routesResolver.resolve(instance);
    }
}