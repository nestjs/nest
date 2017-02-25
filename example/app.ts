import * as morgan from 'morgan';
import { NestApplication } from './../src/';
import * as bodyParser from 'body-parser';

export class Application implements NestApplication {

    constructor(private expressApp) {
        expressApp.use(morgan('tiny'));
        expressApp.use(bodyParser.json());
    }

    start() {
        const server = this.expressApp.listen(3030, () => {
            console.log('Application listen on port:', 3030);
            server.close();
        });
    }
 
}