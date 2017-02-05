import { NestApplication } from "./../src/";

export class Application implements NestApplication {

    constructor(private app) {}

    start() {
        this.app.listen(3030, () => {
            console.log("Application listen on port:", 3030);
        });
    }
 
}