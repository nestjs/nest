import * as express from "express";
import { ExpressConfig } from "./config";
import { NestApplication } from "./../nest/core/interfaces";

export class Application implements NestApplication {
    constructor(private app: express.Express) {
        ExpressConfig.setupConfig(this.app);
    }

    public start() {
        this.app.listen(3030, () => {
            console.log("Application listen on port:", 3030);
        });
    }

}