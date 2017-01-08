import * as express from "express";
import { NestApplication, AppModule } from "./core/interfaces";
import { NestDependenciesScanner } from "./core/scanner";
import { NestInjector } from "./core/injector";
import { NestRoutesResolver } from "./core/routes-resolver";
import { NestContainer } from "./core/container";
import { SocketModule } from "./socket/socket-module";

export class NestRunner {
    private static container = new NestContainer();

    private static dependenciesScanner = new NestDependenciesScanner(NestRunner.container);
    private static injector = new NestInjector(NestRunner.container);
    private static routesResolver = new NestRoutesResolver(NestRunner.container, express.Router);

    static run<T extends NestApplication>(appPrototype, module: AppModule) {
        this.dependenciesScanner.scan(module);
        this.injector.createInstancesOfDependencies();

        this.setupModules();

        const appInstance = this.setupApplication(appPrototype);
        appInstance.start();
    }

    private static setupModules() {
        SocketModule.setup(NestRunner.container);
    }

    private static setupApplication<T extends NestApplicationFactory>(app: { new(app): T }): NestApplication {
        try {
            const expressInstance = express();
            this.routesResolver.resolve(expressInstance);

            const appInstance = new app(expressInstance);
            return appInstance;
        }
        catch(e) {
            throw new Error("Invalid application class passed as parameter.");
        }
    }

}

interface NestApplicationFactory extends NestApplication {
    new (app: express.Express);
}