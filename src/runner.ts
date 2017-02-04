import { Application } from "express";
import { NestApplication, NestModule } from "./common/interfaces";
import { DependenciesScanner } from "./core/scanner";
import { InstanceLoader } from "./core/injector/instance-loader";
import { RoutesResolver } from "./core/router/routes-resolver";
import { NestContainer } from "./core/injector/container";
import { SocketModule } from "./socket/socket-module";
import { MiddlewaresModule } from "./core/middlewares/middlewares-module";
import { NestApplicationFactory } from "./common/interfaces";
import { ExceptionsZone } from "./errors/exceptions-zone";
import { ExpressAdapter } from "./core/adapters/express-adapter";

export class NestRunner {
    private static container = new NestContainer();
    private static dependenciesScanner = new DependenciesScanner(NestRunner.container);
    private static instanceLoader = new InstanceLoader(NestRunner.container);
    private static routesResolver = new RoutesResolver(NestRunner.container, ExpressAdapter);

    static run(applicationClass: NestApplicationFactory, module: NestModule) {
        ExceptionsZone.run(() => {
            this.initialize(module);
            this.setupModules();
            this.startApplication(applicationClass);
        });
    }

    private static initialize(module: NestModule) {
        this.dependenciesScanner.scan(module);
        this.instanceLoader.createInstancesOfDependencies();
    }

    private static setupModules() {
        SocketModule.setup(NestRunner.container);
        MiddlewaresModule.setup(NestRunner.container);
    }

    private static startApplication(applicationClass: NestApplicationFactory) {
        const appInstance = this.setupApplication(applicationClass);
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
