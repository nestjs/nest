import { Application } from "express";
import * as bodyParser from "body-parser";
import * as logger from "morgan";

export class ExpressConfig {

    static setupConfig(app: Application) {
        app.use(logger("dev"));
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));
    }

}