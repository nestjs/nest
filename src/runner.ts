import { Application } from 'express';
import { NestApplication } from './common/interfaces';
import { DependenciesScanner } from './core/scanner';
import { InstanceLoader } from './core/injector/instance-loader';
import { RoutesResolver } from './core/router/routes-resolver';
import { NestContainer } from './core/injector/container';
import { SocketModule } from './socket/socket-module';
import { MiddlewaresModule } from './core/middlewares/middlewares-module';
import { NestApplicationFactory } from './common/interfaces';
import { ExceptionsZone } from './errors/exceptions-zone';
import { ExpressAdapter } from './core/adapters/express-adapter';
import { NestModuleMetatype } from './common/interfaces/module-metatype.interface';
import { Logger } from './common/services/logger.service';
import { APPLICATION_START, APPLICATION_READY } from './core/constants';

export class NestRunner {
    private static container = new NestContainer();
    private static dependenciesScanner = new DependenciesScanner(NestRunner.container);
    private static instanceLoader = new InstanceLoader(NestRunner.container);
    private static routesResolver = new RoutesResolver(NestRunner.container, ExpressAdapter);
    private static logger = new Logger(NestRunner.name);

    static run(applicationMetatype: NestApplicationFactory, module: NestModuleMetatype) {
        ExceptionsZone.run(() => {
            this.initialize(module);
            this.setupModules();
            this.startApplication(applicationMetatype);
        });
    }

    private static initialize(module: NestModuleMetatype) {
        this.logger.log(APPLICATION_START);
        this.dependenciesScanner.scan(module);
        this.instanceLoader.createInstancesOfDependencies();
    }

    private static setupModules() {
        SocketModule.setup(this.container);
        MiddlewaresModule.setup(this.container);
    }

    private static startApplication(applicationMetatype: NestApplicationFactory) {
        const appInstance = this.setupApplication(applicationMetatype);

        this.logger.log(APPLICATION_READY);
        appInstance.start();
    }

    private static setupApplication<T extends NestApplicationFactory>(app: T): NestApplication {
        const expressInstance = ExpressAdapter.create();
        const appInstance = new app(expressInstance);

        this.setupMiddlewares(expressInstance);
        this.setupRoutes(expressInstance);
        return appInstance;
    }

    private static setupMiddlewares(expressInstance: Application) {
        MiddlewaresModule.setupMiddlewares(expressInstance);
    }

    private static setupRoutes(expressInstance: Application) {
        this.routesResolver.resolve(expressInstance);
    }
}
