import { NestRunner } from "./../src/";
import { Application } from "./app";
import { ApplicationModule } from "./modules/app.module";

NestRunner.run(Application, ApplicationModule);