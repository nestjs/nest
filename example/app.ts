import { NestApplication } from './../src/';

export class Application implements NestApplication {

    constructor(private expressApp) {}

    start() {
        this.expressApp.listen(3030, () => {
            console.log('Application listen on port:', 3030);
        });
    }
 
}