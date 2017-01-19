import* as express from "express";
import { ExpressConfig } from "./config";
import { NestApplication } from "./../nest/core/interfaces";
import { PassportJWTConfig } from "./config/passport-jwt.config";

export class Application implements NestApplication {

    constructor(private app: express.Application) {
        ExpressConfig.setupConfig(this.app);
        PassportJWTConfig.setupConfig(this.app);
    }

    public start() {
        this.app.listen(3030, () => {
            console.log("Application listen on port:", 3030);
        });
    }
 
}