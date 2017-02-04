import { ExpressConfig } from "./config";
import { PassportJWTConfig } from "./config/passport-jwt.config";
import { NestApplication } from "./../src/";

export class Application implements NestApplication {

    constructor(private app) {
        ExpressConfig.setupConfig(this.app);
        PassportJWTConfig.setupConfig(this.app);
    }

    public start() {
        console.log("star t");
        this.app.listen(3030, () => {
            console.log("Nest Application listen on port:", 3030);
        });
    }
 
}