import { NestRunner } from "./nest/runner";
import { Application } from "./app/app";
import { ApplicationModule } from "./app/modules/app.module";

NestRunner.run<Application>(Application, ApplicationModule);
