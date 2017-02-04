import * as express from "express";
import { NestApplication, NestModule } from "./core/interfaces";
import { DependenciesScanner } from "./core/scanner";
import { NestInjector } from "./core/injector";
import { NestRoutesResolver } from "./core/routes-resolver";
import { NestContainer } from "./core/container";
import { SocketModule } from "./socket/socket-module";
import { MiddlewaresModule } from "./core/middlewares/module";
import { NestApplicationFactory } from "./core/interfaces";

export class NestRunner {
    private static container = new NestContainer();
    private static dependenciesScanner = new DependenciesScanner(NestRunner.container);
    private static injector = new NestInjector(NestRunner.container);
    private static routesResolver = new NestRoutesResolver(NestRunner.container, express.Router);

    static run(applicationClass: NestApplicationFactory, module: NestModule) {
        this.initialize(module);
        this.setupModules();
        this.startApplication(applicationClass);
    }

    private static initialize(module: NestModule) {
        this.dependenciesScanner.scan(module);
        this.injector.createInstancesOfDependencies();
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
        try {
            const expressInstance = express();
            const appInstance = new app(expressInstance);

            this.setupMiddlewares(expressInstance);
            this.setupRoutes(expressInstance);
            return appInstance;
        }
        catch(e) {
            throw new Error('Invalid application class passed as parameter.');
        }
    }

    private static setupMiddlewares(expressInstance: express.Application) {
        MiddlewaresModule.setupMiddlewares(expressInstance);
    }

    private static setupRoutes(expressInstance: express.Application) {
        this.routesResolver.resolve(expressInstance);
    }
}
