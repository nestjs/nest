import { NestApplication } from './../src/';

export class Application implements NestApplication {

    constructor(private expressApp) {}

    start() {
        const server = this.expressApp.listen(3030, () => {
            console.log('Application listen on port:', 3030);
            server.close();
        });
    }
 
}